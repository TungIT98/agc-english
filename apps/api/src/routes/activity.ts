import { Hono } from "hono";
import type { Env } from "../index";

const router = new Hono<{ Bindings: Env }>();

router.post("/", async (c) => {
  const { agentId, eventType, description, metadata } = await c.req.json<{
    agentId?: string;
    eventType?: string;
    description?: string;
    metadata?: string;
  }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const companyId = "agc-english";
  const db = c.env.DB as D1Database;

  try {
    await db
      .prepare(
        `INSERT INTO activity_log (id, company_id, agent_id, event_type, description, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, companyId, agentId || null, eventType || "general", description || "", metadata || null, now)
      .run();

    return c.json({ activity: { id, agentId, eventType, description, metadata, createdAt: now } }, 201);
  } catch (error) {
    return c.json({ error: "Failed to log activity", details: String(error) }, 500);
  }
});

router.get("/", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const limit = Math.min(Number(c.req.query("limit")) || 50, 200);
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT a.id, a.agent_id, a.event_type, a.description, a.metadata, a.created_at,
                ag.name as agent_name
         FROM activity_log a
         LEFT JOIN agents ag ON a.agent_id = ag.id
         WHERE a.company_id = ?
         ORDER BY a.created_at DESC
         LIMIT ?`
      )
      .bind(companyId, limit)
      .all();

    return c.json({
      activities: result.results.map((row) => ({
        id: (row as { id: string }).id,
        agentId: (row as { agent_id: string | null }).agent_id,
        agentName: (row as { agent_name: string | null }).agent_name,
        eventType: (row as { event_type: string }).event_type,
        description: (row as { description: string }).description,
        metadata: (row as { metadata: string | null }).metadata,
        createdAt: (row as { created_at: string }).created_at,
      })),
    });
  } catch {
    return c.json({ activities: [] });
  }
});

router.get("/sessions/:agentId", async (c) => {
  const agentId = c.req.param("agentId");
  const limit = Math.min(Number(c.req.query("limit")) || 10, 50);
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT id, agent_id, event_type, description, metadata, created_at
         FROM activity_log
         WHERE agent_id = ? AND event_type IN ('agent_query', 'chain_of_thought')
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(agentId, limit)
      .all();

    // Group by session (using 5-minute windows)
    const sessions: Record<string, { query: unknown; steps: unknown[] }> = {};
    for (const row of result.results) {
      const r = row as { id: string; agent_id: string; event_type: string; description: string; metadata: string | null; created_at: string };
      const ts = new Date(r.created_at).getTime();
      const windowKey = Math.floor(ts / 300000).toString();
      if (!sessions[windowKey]) {
        sessions[windowKey] = { query: null, steps: [] };
      }
      if (r.event_type === "agent_query") {
        sessions[windowKey] = {
          query: {
            id: r.id,
            description: r.description,
            metadata: r.metadata ? JSON.parse(r.metadata) : {},
            createdAt: r.created_at,
          },
          steps: sessions[windowKey].steps,
        };
      } else if (r.event_type === "chain_of_thought") {
        sessions[windowKey].steps.push({
          id: r.id,
          description: r.description,
          metadata: r.metadata ? JSON.parse(r.metadata) : {},
          createdAt: r.created_at,
        });
      }
    }

    return c.json({
      sessions: Object.values(sessions)
        .filter((s) => s.query !== null)
        .slice(0, limit),
    });
  } catch {
    return c.json({ sessions: [] });
  }
});

router.get("/steps/:activityId", async (c) => {
  const activityId = c.req.param("activityId");
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT id, description, metadata, created_at
         FROM activity_log
         WHERE event_type = 'chain_of_thought'
           AND JSON_EXTRACT(metadata, '$.parentId') = ?
         ORDER BY created_at ASC`
      )
      .bind(activityId)
      .all();

    return c.json({
      steps: result.results.map((row) => ({
        id: (row as { id: string }).id,
        description: (row as { description: string }).description,
        metadata: (row as { metadata: string | null }).metadata ? JSON.parse((row as { metadata: string }).metadata) : {},
        createdAt: (row as { created_at: string }).created_at,
      })),
    });
  } catch {
    return c.json({ steps: [] });
  }
});

export const activityRouter = router;