import { Hono } from "hono";
import type { Env } from "../index";

const router = new Hono<{ Bindings: Env }>();

router.post("/", async (c) => {
  const { taskId, requestedBy, notes } = await c.req.json<{
    taskId?: string;
    requestedBy?: string;
    notes?: string;
  }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = c.env.DB as D1Database;

  try {
    await db
      .prepare(
        `INSERT INTO approvals (id, task_id, status, requested_by, created_at)
         VALUES (?, ?, 'pending', ?, ?)`
      )
      .bind(id, taskId || null, requestedBy || null, now)
      .run();

    const approval = await db.prepare("SELECT * FROM approvals WHERE id = ?").bind(id).first();
    return c.json({ approval }, 201);
  } catch (error) {
    return c.json({ error: "Failed to create approval", details: String(error) }, 500);
  }
});

router.get("/", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT a.*, t.title as task_title
         FROM approvals a
         JOIN tasks t ON a.task_id = t.id
         WHERE t.company_id = ?
         ORDER BY a.created_at DESC`
      )
      .bind(companyId)
      .all();

    return c.json({ approvals: result.results });
  } catch {
    return c.json({ approvals: [] });
  }
});

router.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB as D1Database;
  const now = new Date().toISOString();

  try {
    await db
      .prepare("UPDATE approvals SET status = 'approved', approved_by = 'ceo', created_at = ? WHERE id = ?")
      .bind(now, id)
      .run();

    const updated = await db.prepare("SELECT * FROM approvals WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Approval not found" }, 404);
    return c.json({ approval: updated });
  } catch {
    return c.json({ error: "Failed to approve" }, 500);
  }
});

router.post("/:id/reject", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB as D1Database;
  const now = new Date().toISOString();

  try {
    await db
      .prepare("UPDATE approvals SET status = 'rejected', approved_by = 'ceo', created_at = ? WHERE id = ?")
      .bind(now, id)
      .run();

    const updated = await db.prepare("SELECT * FROM approvals WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Approval not found" }, 404);
    return c.json({ approval: updated });
  } catch {
    return c.json({ error: "Failed to reject" }, 500);
  }
});

export const approvalsRouter = router;
