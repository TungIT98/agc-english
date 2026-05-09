import { Hono } from "hono";
import type { Env } from "../index";

const router = new Hono<{ Bindings: Env }>();

router.get("/", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const status = c.req.query("status");
  const db = c.env.DB as D1Database;

  try {
    let query = "SELECT * FROM tasks WHERE company_id = ?";
    const bindings: string[] = [companyId];

    if (status) {
      query += " AND status = ?";
      bindings.push(status);
    }

    query += " ORDER BY priority DESC, created_at DESC";

    const result = await db.prepare(query).bind(...bindings).all();
    return c.json({ tasks: result.results });
  } catch {
    return c.json({ tasks: [] });
  }
});

router.post("/", async (c) => {
  const { title, description, priority, assigneeAgentId, companyId } = await c.req.json<{
    title: string;
    description?: string;
    priority?: number;
    assigneeAgentId?: string;
    companyId?: string;
  }>();

  const company = companyId || "agc-english";
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = c.env.DB as D1Database;

  try {
    await db
      .prepare(
        `INSERT INTO tasks (id, company_id, title, description, status, priority, assignee_agent_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
      )
      .bind(id, company, title, description || "", priority || 0, assigneeAgentId || null, now, now)
      .run();

    return c.json(
      {
        task: {
          id,
          company_id: company,
          title,
          description: description || "",
          status: "pending",
          priority: priority || 0,
          assignee_agent_id: assigneeAgentId || null,
          created_at: now,
          updated_at: now,
        },
      },
      201
    );
  } catch (error) {
    return c.json({ error: "Failed to create task", details: String(error) }, 500);
  }
});

router.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const updates = await c.req.json<Record<string, unknown>>();
  const db = c.env.DB as D1Database;

  const allowedFields = ["title", "description", "status", "priority", "assignee_agent_id"];
  const setClauses: string[] = [];
  const bindings: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (allowedFields.includes(snakeKey)) {
      setClauses.push(`${snakeKey} = ?`);
      bindings.push(value);
    }
  }

  if (setClauses.length === 0) {
    return c.json({ error: "No valid fields to update" }, 400);
  }

  setClauses.push("updated_at = ?");
  bindings.push(new Date().toISOString());
  bindings.push(id);

  try {
    await db
      .prepare(`UPDATE tasks SET ${setClauses.join(", ")} WHERE id = ?`)
      .bind(...bindings)
      .run();

    const updated = await db.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first();
    return c.json({ task: updated });
  } catch {
    return c.json({ error: "Failed to update task" }, 500);
  }
});

router.post("/:id/checkout", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB as D1Database;
  const now = new Date().toISOString();

  try {
    await db
      .prepare("UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'pending'")
      .bind(now, id)
      .run();

    const updated = await db.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first();
    if (!updated) {
      return c.json({ error: "Task not found or already checked out" }, 404);
    }
    return c.json({ task: updated });
  } catch {
    return c.json({ error: "Failed to checkout task" }, 500);
  }
});

export const tasksRouter = router;
