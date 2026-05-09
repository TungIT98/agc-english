import { Hono } from "hono";
import type { Env } from "../index";

const router = new Hono<{ Bindings: Env }>();

router.get("/", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const db = c.env.DB as D1Database;

  try {
    const company = await db
      .prepare("SELECT * FROM companies WHERE id = ?")
      .bind(companyId)
      .first();

    if (!company) {
      return c.json({ error: "Company not found" }, 404);
    }

    const agents = await db
      .prepare("SELECT id, name, role, budget_monthly_cents FROM agents WHERE company_id = ?")
      .bind(companyId)
      .all();

    return c.json({
      company: {
        id: (company as { id: string }).id,
        name: (company as { name: string }).name,
        budgetMonthlyCents: (company as { budget_monthly_cents: number }).budget_monthly_cents,
      },
      agents: agents.results.map((a) => ({
        id: (a as { id: string }).id,
        name: (a as { name: string }).name,
        role: (a as { role: string }).role,
        budgetMonthlyCents: (a as { budget_monthly_cents: number }).budget_monthly_cents,
      })),
    });
  } catch {
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

router.patch("/", async (c) => {
  const { companyName, agentBudgets } = await c.req.json<{
    companyName?: string;
    agentBudgets?: Record<string, number>;
  }>();

  const companyId = "agc-english";
  const db = c.env.DB as D1Database;

  try {
    if (companyName !== undefined) {
      await db
        .prepare("UPDATE companies SET name = ? WHERE id = ?")
        .bind(companyName, companyId)
        .run();
    }

    if (agentBudgets) {
      for (const [agentId, budget] of Object.entries(agentBudgets)) {
        await db
          .prepare("UPDATE agents SET budget_monthly_cents = ? WHERE id = ? AND company_id = ?")
          .bind(budget, agentId, companyId)
          .run();
      }
    }

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

export const settingsRouter = router;