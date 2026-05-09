import { Hono } from "hono";
import type { Env } from "../index";
import { getAgent, checkBudget } from "../services/agent";

const router = new Hono<{ Bindings: Env }>();

router.post("/", async (c) => {
  const { agentId, inputTokens, outputTokens, costCents, model } = await c.req.json<{
    agentId?: string;
    inputTokens?: number;
    outputTokens?: number;
    costCents?: number;
    model?: string;
  }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = c.env.DB as D1Database;

  try {
    await db
      .prepare(
        `INSERT INTO cost_events (id, agent_id, input_tokens, output_tokens, cost_cents, model, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, agentId || null, inputTokens || 0, outputTokens || 0, costCents || 0, model || "MiniMax-M2.7", now)
      .run();

    return c.json(
      {
        event: {
          id,
          agent_id: agentId || null,
          input_tokens: inputTokens || 0,
          output_tokens: outputTokens || 0,
          cost_cents: costCents || 0,
          model: model || "MiniMax-M2.7",
          created_at: now,
        },
      },
      201
    );
  } catch (error) {
    return c.json({ error: "Failed to record cost event", details: String(error) }, 500);
  }
});

router.get("/summary", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT
           COALESCE(SUM(cost_cents), 0) as total_cost_cents,
           COALESCE(SUM(input_tokens), 0) as total_input_tokens,
           COALESCE(SUM(output_tokens), 0) as total_output_tokens,
           COUNT(*) as event_count
         FROM cost_events ce
         JOIN agents a ON ce.agent_id = a.id
         WHERE a.company_id = ?`
      )
      .bind(companyId)
      .first();

    return c.json({
      totalCostCents: (result as { total_cost_cents: number }).total_cost_cents,
      totalInputTokens: (result as { total_input_tokens: number }).total_input_tokens,
      totalOutputTokens: (result as { total_output_tokens: number }).total_output_tokens,
      eventCount: (result as { event_count: number }).event_count,
    });
  } catch {
    return c.json({ totalCostCents: 0, totalInputTokens: 0, totalOutputTokens: 0, eventCount: 0 });
  }
});

router.get("/by-agent", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT
           ce.agent_id,
           COALESCE(SUM(ce.cost_cents), 0) as cost_cents,
           COALESCE(SUM(ce.input_tokens), 0) as input_tokens,
           COALESCE(SUM(ce.output_tokens), 0) as output_tokens
         FROM cost_events ce
         JOIN agents a ON ce.agent_id = a.id
         WHERE a.company_id = ?
         GROUP BY ce.agent_id`
      )
      .bind(companyId)
      .all();

    const byAgent: Record<string, unknown> = {};
    for (const row of result.results) {
      const r = row as { agent_id: string; cost_cents: number; input_tokens: number; output_tokens: number };
      const budgetStatus = checkBudget(r.agent_id, r.cost_cents);

      byAgent[r.agent_id] = {
        costCents: r.cost_cents,
        inputTokens: r.input_tokens,
        outputTokens: r.output_tokens,
        ...(budgetStatus ?? {
          agentId: r.agent_id,
          budgetMonthlyCents: 0,
          spentCents: r.cost_cents,
          remainingCents: 0,
          ratio: 0,
          status: "ok",
          message: "Budget config not found",
        }),
      };
    }
    return c.json({ byAgent });
  } catch {
    return c.json({ byAgent: {} });
  }
});

router.post("/top-up", async (c) => {
  const { agentId, amountCents } = await c.req.json<{ agentId?: string; amountCents?: number }>();
  const db = c.env.DB as D1Database;

  try {
    await db
      .prepare("UPDATE agents SET budget_monthly_cents = budget_monthly_cents + ? WHERE id = ?")
      .bind(amountCents || 0, agentId || "")
      .run();
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to top up" }, 500);
  }
});

router.post("/transfer", async (c) => {
  const { fromAgentId, toAgentId, amountCents } = await c.req.json<{ fromAgentId?: string; toAgentId?: string; amountCents?: number }>();
  const db = c.env.DB as D1Database;

  try {
    await db.prepare("UPDATE agents SET budget_monthly_cents = budget_monthly_cents - ? WHERE id = ?").bind(amountCents || 0, fromAgentId || "").run();
    await db.prepare("UPDATE agents SET budget_monthly_cents = budget_monthly_cents + ? WHERE id = ?").bind(amountCents || 0, toAgentId || "").run();
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to transfer" }, 500);
  }
});

router.get("/trend", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const days = Math.min(parseInt(c.req.query("days") || "7"), 30);
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT
           DATE(ce.created_at) as day,
           COALESCE(SUM(ce.cost_cents), 0) as cost_cents
         FROM cost_events ce
         JOIN agents a ON ce.agent_id = a.id
         WHERE a.company_id = ?
           AND ce.created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY DATE(ce.created_at)
         ORDER BY day ASC`
      )
      .bind(companyId, String(days))
      .all();

    const byDay: Record<string, number> = {};
    for (const row of result.results) {
      const r = row as { day: string; cost_cents: number };
      byDay[r.day] = r.cost_cents;
    }

    // Fill in all days in the range (zero-fill missing days)
    const trend: { day: string; spend: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      trend.push({ day: label, spend: (byDay[key] ?? 0) / 100 });
    }

    return c.json({ trend });
  } catch {
    return c.json({ trend: [] });
  }
});

router.get("/forecast", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const db = c.env.DB as D1Database;

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const now = new Date();
    const daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    const result = await db
      .prepare(
        `SELECT COALESCE(SUM(cost_cents), 0) as total_spent
         FROM cost_events ce
         JOIN agents a ON ce.agent_id = a.id
         WHERE a.company_id = ? AND ce.created_at >= ?`
      )
      .bind(companyId, startOfMonth.toISOString())
      .first();

    const totalSpent = (result as { total_spent: number }).total_spent;
    const dailyAvg = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const projectedTotal = Math.round(dailyAvg * daysInMonth);
    const remainingBudget = await db
      .prepare("SELECT COALESCE(SUM(budget_monthly_cents), 0) as total FROM agents WHERE company_id = ?")
      .bind(companyId)
      .first()
      .then((r) => (r as { total: number }).total);

    return c.json({
      totalSpentCents: totalSpent,
      dailyAvgCents: Math.round(dailyAvg),
      projectedTotalCents: projectedTotal,
      remainingDays: daysRemaining,
      remainingBudgetCents: remainingBudget - totalSpent,
      projectedOverspendCents: Math.max(0, projectedTotal - remainingBudget),
    });
  } catch {
    return c.json({ error: "Failed to forecast" }, 500);
  }
});

export const costsRouter = router;