import { Hono } from "hono";
import type { Env } from "../index";

const router = new Hono<{ Bindings: Env }>();

// GET /api/governance/agents — list agents with governance metadata
router.get("/agents", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT a.id, a.name, a.role, a.status, a.budget_monthly_cents, a.spent_monthly_cents,
                a.created_at, ag.name as creator_name,
                (SELECT COUNT(*) FROM activity_log WHERE agent_id = a.id) as total_events,
                (SELECT MAX(created_at) FROM activity_log WHERE agent_id = a.id AND event_type = 'agent_query') as last_query
         FROM agents a
         LEFT JOIN agents ag ON ag.id = a.id
         WHERE a.company_id = ?
         ORDER BY a.created_at DESC`
      )
      .bind(companyId)
      .all();

    return c.json({
      agents: result.results.map((row) => {
        const r = row as { id: string; name: string; role: string; status: string; budget_monthly_cents: number; spent_monthly_cents: number; created_at: string; creator_name: string | null; total_events: number; last_query: string | null };
        return {
          id: r.id,
          name: r.name,
          role: r.role,
          status: r.status,
          enabled: r.status !== "blocked",
          budgetMonthlyCents: r.budget_monthly_cents,
          spentMonthlyCents: r.spent_monthly_cents,
          createdAt: r.created_at,
          creatorName: r.creator_name || "System",
          totalEvents: r.total_events,
          lastQueryAt: r.last_query,
        };
      }),
    });
  } catch {
    return c.json({ agents: [] });
  }
});

// PATCH /api/governance/agents/:id — enable/disable/pause an agent
router.patch("/agents/:id", async (c) => {
  const agentId = c.req.param("id");
  const { action } = await c.req.json<{ action?: string }>();
  const db = c.env.DB as D1Database;

  const statusMap: Record<string, string> = {
    enable: "idle",
    disable: "blocked",
    pause: "paused",
  };

  const newStatus = statusMap[action || ""];
  if (!newStatus) {
    return c.json({ error: "Invalid action. Use: enable, disable, pause" }, 400);
  }

  try {
    await db
      .prepare("UPDATE agents SET status = ? WHERE id = ?")
      .bind(newStatus, agentId)
      .run();

    // Log governance action
    await db
      .prepare(
        `INSERT INTO activity_log (id, company_id, agent_id, event_type, description, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        "agc-english",
        agentId,
        "governance",
        `Agent ${action}: status set to ${newStatus}`,
        JSON.stringify({ action, newStatus }),
        new Date().toISOString()
      )
      .run();

    return c.json({ agentId, status: newStatus, action });
  } catch (err) {
    return c.json({ error: "Failed to update agent", details: String(err) }, 500);
  }
});

// GET /api/governance/audit — audit log for governance actions
router.get("/audit", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const limit = Math.min(Number(c.req.query("limit")) || 50, 200);
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT al.id, al.agent_id, al.event_type, al.description, al.metadata, al.created_at,
                a.name as agent_name
         FROM activity_log al
         LEFT JOIN agents a ON al.agent_id = a.id
         WHERE al.company_id = ? AND al.event_type IN ('governance', 'agent_creation', 'budget_change')
         ORDER BY al.created_at DESC
         LIMIT ?`
      )
      .bind(companyId, limit)
      .all();

    return c.json({
      entries: result.results.map((row) => {
        const r = row as { id: string; agent_id: string | null; event_type: string; description: string; metadata: string | null; created_at: string; agent_name: string | null };
        return {
          id: r.id,
          agentId: r.agent_id,
          agentName: r.agent_name || "System",
          eventType: r.event_type,
          description: r.description,
          metadata: r.metadata ? JSON.parse(r.metadata) : {},
          createdAt: r.created_at,
        };
      }),
    });
  } catch {
    return c.json({ entries: [] });
  }
});

// GET /api/governance/stats — governance statistics
router.get("/stats", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const db = c.env.DB as D1Database;

  try {
    const agentCount = await db.prepare("SELECT COUNT(*) as cnt FROM agents WHERE company_id = ?").bind(companyId).first();
    const activeAgents = await db.prepare("SELECT COUNT(*) as cnt FROM agents WHERE company_id = ? AND status NOT IN ('blocked','paused')").bind(companyId).first();
    const blockedAgents = await db.prepare("SELECT COUNT(*) as cnt FROM agents WHERE company_id = ? AND status = 'blocked'").bind(companyId).first();
    const governanceEvents = await db.prepare("SELECT COUNT(*) as cnt FROM activity_log WHERE company_id = ? AND event_type = 'governance'").bind(companyId).first();
    const totalBudget = await db.prepare("SELECT COALESCE(SUM(budget_monthly_cents),0) as total FROM agents WHERE company_id = ?").bind(companyId).first();

    return c.json({
      totalAgents: (agentCount as { cnt: number } | null)?.cnt ?? 0,
      activeAgents: (activeAgents as { cnt: number } | null)?.cnt ?? 0,
      blockedAgents: (blockedAgents as { cnt: number } | null)?.cnt ?? 0,
      governanceEvents: (governanceEvents as { cnt: number } | null)?.cnt ?? 0,
      totalMonthlyBudgetCents: (totalBudget as { total: number } | null)?.total ?? 0,
    });
  } catch {
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

export const governanceRouter = router;