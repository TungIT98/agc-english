// Database service - D1 helpers

export interface Env {
  DB: D1Database;
}

export async function getCompany(db: D1Database, companyId: string) {
  const result = await db
    .prepare("SELECT * FROM companies WHERE id = ?")
    .bind(companyId)
    .first();
  return result;
}

export async function listAgents(db: D1Database, companyId: string) {
  const result = await db
    .prepare("SELECT * FROM agents WHERE company_id = ?")
    .bind(companyId)
    .all();
  return result.results;
}

export async function createTask(
  db: D1Database,
  task: {
    id: string;
    companyId: string;
    title: string;
    description?: string;
    status?: string;
    priority?: number;
    assigneeAgentId?: string;
  }
) {
  await db
    .prepare(
      `INSERT INTO tasks (id, company_id, title, description, status, priority, assignee_agent_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(
      task.id,
      task.companyId,
      task.title,
      task.description || "",
      task.status || "pending",
      task.priority || 0,
      task.assigneeAgentId || null
    )
    .run();
}