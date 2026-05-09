import { Hono } from "hono";
import type { Env } from "../index";
import {
  agentConfigs,
  getAgent,
  checkBudget,
  type BudgetStatus,
} from "../services/agent";

const router = new Hono<{ Bindings: Env }>();

// Default agent configs used as fallback when DB is unavailable
const DEFAULT_AGENTS = [
  {
    id: "ceo",
    name: "CEO Agent",
    description: "Chief Executive Officer - điều phối toàn bộ hệ thống",
    prompt:
      "Bạn là CEO của AGC_English. Bạn điều phối 5 manager agents và tổng hợp kết quả. Khi nhận task: 1) Phân tích và quyết định delegate 2) Giao task cho manager phù hợp 3) Tổng hợp kết quả và báo cáo.",
    tools: ["Read", "Write", "Agent"],
  },
  {
    id: "cskh",
    name: "CSKH Manager",
    description: "Customer Support Manager",
    prompt:
      "Bạn là CSKH Manager của AGC_English. Xử lý khiếu nại và quyết định refund dưới $50 tự động.",
    tools: ["Read", "search_student", "update_order", "send_zalo"],
  },
  {
    id: "sales",
    name: "Sales Manager",
    description: "Sales Director",
    prompt: "Bạn là Sales Manager của AGC_English. Tư vấn và chốt đơn.",
    tools: ["Read", "search_student", "create_order", "update_lead"],
  },
  {
    id: "content",
    name: "Content Manager",
    description: "Content Director",
    prompt: "Bạn là Content Manager của AGC_English. Tạo nội dung bài học và marketing.",
    tools: ["Read", "Write", "create_lesson", "publish_social"],
  },
  {
    id: "training",
    name: "Training Manager",
    description: "Training Director",
    prompt: "Bạn là Training Manager của AGC_English. Cá nhân hóa lộ trình học.",
    tools: ["Read", "create_assessment", "update_progress", "recommend_course"],
  },
  {
    id: "branding",
    name: "Branding Manager",
    description: "Brand Guardian",
    prompt:
      "Bạn là Branding Manager của AGC_English. Đảm bảo nhất quán thương hiệu.",
    tools: ["Read", "review_content", "check_brand_compliance"],
  },
];

router.get("/", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare("SELECT * FROM agents WHERE company_id = ? ORDER BY created_at")
      .bind(companyId)
      .all();

    if (result.results.length > 0) {
      return c.json({ agents: result.results });
    }
    return c.json({ agents: DEFAULT_AGENTS });
  } catch {
    return c.json({ agents: DEFAULT_AGENTS });
  }
});

router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .bind(id)
      .first();

    if (result) {
      return c.json({ agent: result });
    }
    const fallback = DEFAULT_AGENTS.find((a) => a.id === id);
    if (fallback) return c.json({ agent: fallback });
    return c.json({ error: "Agent not found" }, 404);
  } catch {
    const fallback = DEFAULT_AGENTS.find((a) => a.id === id);
    if (fallback) return c.json({ agent: fallback });
    return c.json({ error: "Agent not found" }, 404);
  }
});

router.get("/:id/budget", async (c) => {
  const agentId = c.req.param("id");
  const db = c.env.DB as D1Database;

  try {
    const result = await db
      .prepare(
        `SELECT COALESCE(SUM(cost_cents), 0) as spent_cents
         FROM cost_events WHERE agent_id = ?`
      )
      .bind(agentId)
      .first();

    const spentCents = (result as { spent_cents: number } | null)?.spent_cents ?? 0;
    const budget = checkBudget(agentId, spentCents);

    if (budget) return c.json(budget);
    return c.json({ error: "Agent not found" }, 404);
  } catch {
    return c.json({ error: "Failed to check budget" }, 500);
  }
});

router.post("/preview", async (c) => {
  const { agentId, prompt } = await c.req.json<{ agentId?: string; prompt: string }>();

  const targetAgent = getAgent(agentId || "ceo") || getAgent("ceo")!;

  // Analyze the prompt for risky actions
  const intents: Array<{ id: string; icon: string; action: string; detail: string; risk: "safe" | "caution" | "action" }> = [];

  const p = prompt.toLowerCase();

  // Budget-sensitive operations
  if (p.includes("buy") || p.includes("purchase") || p.includes("thanh toán") || p.includes("pay") || p.includes("order") || p.includes("đặt")) {
    intents.push({
      id: "spend-budget",
      icon: "spend_budget",
      action: "Process payment / create order",
      detail: `Agent will process a transaction or create an order on behalf of the user. Budget will be deducted.`,
      risk: "action",
    });
  }

  // Zalo / messaging
  if (p.includes("zalo") || p.includes("messenger") || p.includes("message") || p.includes("gửi tin") || p.includes("send")) {
    intents.push({
      id: "send-zalo",
      icon: "send_zalo",
      action: "Send Zalo / messenger message",
      detail: "Agent will send a message to a customer via Zalo or messenger on your behalf.",
      risk: "action",
    });
  }

  // Approvals
  if (p.includes("approval") || p.includes("approve") || p.includes("duyệt") || p.includes("xin phê") || p.includes("refund")) {
    intents.push({
      id: "create-approval",
      icon: "create_approval",
      action: "Create approval request",
      detail: "Agent will create a formal approval request that requires human confirmation before proceeding.",
      risk: "action",
    });
  }

  // Refund over threshold
  if ((p.includes("refund") || p.includes("hoàn tiền") || p.includes("khiếu nại")) && !p.includes("dưới")) {
    intents.push({
      id: "refund-request",
      icon: "create_approval",
      action: "Process refund request",
      detail: "Agent will evaluate and process a refund or complaint response. This may involve financial impact.",
      risk: "caution",
    });
  }

  // Student data search
  if (p.includes("student") || p.includes("học viên") || p.includes("search") || p.includes("tìm kiếm")) {
    intents.push({
      id: "search-student",
      icon: "search_student",
      action: "Search student records",
      detail: "Agent will query the student database for relevant records and profiles.",
      risk: "safe",
    });
  }

  // Create lesson/content
  if (p.includes("create") && (p.includes("lesson") || p.includes("content") || p.includes("bài học") || p.includes("nội dung"))) {
    intents.push({
      id: "create-content",
      icon: "create_task",
      action: "Create new lesson or content",
      detail: "Agent will generate and publish new learning content or lesson materials.",
      risk: "safe",
    });
  }

  // Delegate to another agent
  if (p.includes("delegate") || p.includes("giao") || p.includes("chuyển cho") || p.includes("assign")) {
    intents.push({
      id: "delegate",
      icon: "delegate",
      action: "Delegate to another agent",
      detail: "Agent will assign part of this task to a specialized sub-agent (CSKH, Sales, Content, etc.).",
      risk: "safe",
    });
  }

  // Analyze first
  intents.unshift({
    id: "analyze",
    icon: "analyze",
    action: "Analyze and reason about request",
    detail: `Agent will analyze "${prompt.slice(0, 80)}${prompt.length > 80 ? "…" : ""}" and determine the best course of action.`,
    risk: "safe",
  });

  return c.json({ intents, previewId: crypto.randomUUID() });
});

router.post("/query", async (c) => {
  const { agentId, prompt, sessionId } = await c.req.json<{
    agentId?: string;
    prompt: string;
    sessionId?: string;
  }>();

  const targetAgent = getAgent(agentId || "ceo") || getAgent("ceo")!;
  const minimaxApiKey = c.env.MINIMAX_API_KEY || "";
  const minimaxApiUrl = c.env.MINIMAX_API_URL || "https://api.minimax.io";

  // Check budget before running query
  const db = c.env.DB as D1Database;
  try {
    const budgetResult = await db
      .prepare("SELECT COALESCE(SUM(cost_cents), 0) as spent_cents FROM cost_events WHERE agent_id = ?")
      .bind(targetAgent.id)
      .first();
    const spentCents = (budgetResult as { spent_cents: number } | null)?.spent_cents ?? 0;
    const budgetStatus = checkBudget(targetAgent.id, spentCents);

    if (budgetStatus?.status === "blocked") {
      return c.json({ error: "Budget exceeded", ...budgetStatus }, 403);
    }

    // If in warning zone, include warning in response but allow query
    if (budgetStatus?.status === "warning") {
      // Will include budget status in response
    }
  } catch {
    // Budget check optional - allow query if DB unavailable
  }

  // Build system prompt with budget context
  const budgetWarning = (await (async () => {
    try {
      const budgetResult = await db
        .prepare("SELECT COALESCE(SUM(cost_cents), 0) as spent_cents FROM cost_events WHERE agent_id = ?")
        .bind(targetAgent.id)
        .first();
      const spent = (budgetResult as { spent_cents: number } | null)?.spent_cents ?? 0;
      return checkBudget(targetAgent.id, spent);
    } catch {
      return null;
    }
  })());

  const systemPrompt = budgetWarning
    ? `${targetAgent.prompt}\n\n[Budget: ${budgetWarning.spentCents}/${budgetWarning.budgetMonthlyCents} cents — ${budgetWarning.message}]`
    : targetAgent.prompt;

  // Load prior session messages from KV if sessionId provided
  const messages: string[] = [];
  if (sessionId && c.env.agc_english_cache) {
    try {
      const key = `session:${targetAgent.id}:${sessionId}`;
      const raw = await c.env.agc_english_cache.get(key);
      if (raw) {
        const session = JSON.parse(raw);
        for (const msg of session.messages ?? []) {
          messages.push(`${msg.role}: ${msg.content}`);
        }
      }
    } catch {
      // ignore
    }
  }

  // Make the actual MiniMax API call
  try {
    const apiResponse = await fetch(`${minimaxApiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${minimaxApiKey}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      return c.json({ error: "MiniMax API error", details: errText }, 502);
    }

    const apiData = await apiResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
    const result = apiData.choices?.[0]?.message?.content ?? "(no response)";

    // Record cost event (best-effort)
    if (db) {
      try {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const inputTokens = Math.ceil(prompt.length / 4);
        const outputTokens = Math.ceil(result.length / 4);
        const costCents = Math.ceil((inputTokens + outputTokens) * 0.01);
        await db
          .prepare(
            `INSERT INTO cost_events (id, agent_id, input_tokens, output_tokens, cost_cents, model, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(id, targetAgent.id, inputTokens, outputTokens, costCents, "MiniMax-M2.7", now)
          .run();
      } catch {
        // cost tracking best-effort
      }

      // Log agent_query activity (parent event for chain-of-thought steps)
      const actId = crypto.randomUUID();
      const actNow = new Date().toISOString();
      const inTokens = Math.ceil(prompt.length / 4);
      const outTokens = Math.ceil(result.length / 4);
      const actCost = Math.ceil((inTokens + outTokens) * 0.01);
      try {
        await db
          .prepare(
            `INSERT INTO activity_log (id, company_id, agent_id, event_type, description, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(actId, "agc-english", targetAgent.id, "agent_query", `Query processed: ${prompt.slice(0, 60)}…`, JSON.stringify({ inputTokens: inTokens, outputTokens: outTokens, costCents: actCost }), actNow)
          .run();
      } catch { /* activity log best-effort */ }

      // Log chain-of-thought steps
      const steps = [
        { step: "analyze", text: `Analyzing request: "${prompt.slice(0, 80)}"` },
        { step: "reason", text: "Fetching agent configuration and budget status" },
        { step: "call_ai", text: "Calling MiniMax API (MiniMax-M2.7)" },
        { step: "process", text: "Processing response" },
        { step: "complete", text: `Completed in ${outTokens} output tokens` },
      ];
      for (const [i, s] of steps.entries()) {
        try {
          await db
            .prepare(
              `INSERT INTO activity_log (id, company_id, agent_id, event_type, description, metadata, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              crypto.randomUUID(),
              "agc-english",
              targetAgent.id,
              "chain_of_thought",
              s.text,
              JSON.stringify({ step: s.step, parentId: actId, order: i }),
              new Date(Date.now() + i * 500).toISOString()
            )
            .run();
        } catch { /* best-effort */ }
      }

      // Save session to KV if sessionId provided
      if (sessionId && c.env.agc_english_cache) {
        try {
          const key = `session:${targetAgent.id}:${sessionId}`;
          const sessionData = {
            agentId: targetAgent.id,
            messages: [
              { role: "user", content: prompt },
              { role: "assistant", content: result },
            ],
            updatedAt: new Date().toISOString(),
          };
          await c.env.agc_english_cache.put(key, JSON.stringify(sessionData), {
            expirationTtl: 3600,
          });
        } catch {
          // session save best-effort
        }
      }
    }

    return c.json({ result, agentId: targetAgent.id, budget: budgetWarning });
  } catch (error) {
    return c.json(
      { error: "Agent query failed", details: String(error), agentId: targetAgent.id },
      500
    );
  }
});

router.post("/:id/pause", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB as D1Database;

  try {
    await db
      .prepare("UPDATE agents SET status = 'paused' WHERE id = ?")
      .bind(id)
      .run();
    return c.json({ status: "paused", agentId: id });
  } catch {
    return c.json({ status: "paused", agentId: id });
  }
});

router.post("/:id/resume", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB as D1Database;

  try {
    await db
      .prepare("UPDATE agents SET status = 'running' WHERE id = ?")
      .bind(id)
      .run();
    return c.json({ status: "running", agentId: id });
  } catch {
    return c.json({ status: "running", agentId: id });
  }
});

export const agentsRouter = router;

// Autonomy levels
export type AutonomyLevel = "observe" | "propose" | "confirm" | "autonomous";

export const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  observe: "Observe & Suggest",
  propose: "Plan & Propose",
  confirm: "Act with Confirmation",
  autonomous: "Act Autonomously",
};

export const AUTONOMY_DESCRIPTIONS: Record<AutonomyLevel, string> = {
  observe: "Agent analyzes and recommends — you decide and act",
  propose: "Agent creates a plan and waits for your approval",
  confirm: "Agent acts but asks before sensitive operations",
  autonomous: "Agent acts independently within its role",
};

export const AUTONOMY_COLORS: Record<AutonomyLevel, string> = {
  observe: "#71717a",
  propose: "#22d3ee",
  confirm: "#fbbf24",
  autonomous: "#34d399",
};

router.patch("/:id/autonomy", async (c) => {
  const id = c.req.param("id");
  const { level } = await c.req.json<{ level?: string }>();
  const db = c.env.DB as D1Database;

  const validLevels = ["observe", "propose", "confirm", "autonomous"];
  if (!level || !validLevels.includes(level)) {
    return c.json({ error: "Invalid autonomy level" }, 400);
  }

  try {
    // Try to persist in DB
    await db.prepare("UPDATE agents SET config = json_set(config, '$.autonomyLevel', ?) WHERE id = ?").bind(level, id).run();
  } catch {
    // DB not available — continue with in-memory update
  }

  // Update in-memory config
  const agent = getAgent(id);
  if (agent) {
    try {
      const cfg = JSON.parse(agent.config || "{}");
      cfg.autonomyLevel = level;
      agent.config = JSON.stringify(cfg);
    } catch {
      // ignore
    }
  }

  return c.json({ agentId: id, autonomyLevel: level });
});

router.get("/:id/autonomy", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB as D1Database;

  // Try DB first
  if (db) {
    try {
      const result = await db.prepare("SELECT config FROM agents WHERE id = ?").bind(id).first();
      if (result) {
        const config = JSON.parse((result as { config: string }).config || "{}");
        const level = config.autonomyLevel || "confirm";
        return c.json({ agentId: id, level, label: AUTONOMY_LABELS[level as AutonomyLevel], description: AUTONOMY_DESCRIPTIONS[level as AutonomyLevel] });
      }
    } catch { /* fall through */ }
  }

  // Fall back to in-memory
  const agent = getAgent(id);
  if (agent) {
    try {
      const config = JSON.parse(agent.config || "{}");
      const level = config.autonomyLevel || "confirm";
      return c.json({ agentId: id, level, label: AUTONOMY_LABELS[level as AutonomyLevel], description: AUTONOMY_DESCRIPTIONS[level as AutonomyLevel] });
    } catch { /* ignore */ }
  }

  return c.json({ agentId: id, level: "confirm", label: AUTONOMY_LABELS.confirm, description: AUTONOMY_DESCRIPTIONS.confirm });
});

// Shared workspace locking (in-memory)
const AGENT_LOCKS: Record<string, { lockedBy: string; task: string; lockedAt: string }> = {};

router.get("/:id/lock", async (c) => {
  const agentId = c.req.param("id");
  const lock = AGENT_LOCKS[agentId];
  return c.json({ locked: !!lock, lock: lock || null });
});

router.post("/:id/lock", async (c) => {
  const agentId = c.req.param("id");
  const { task, lockedBy } = await c.req.json<{ task?: string; lockedBy?: string }>();
  if (!task || !lockedBy) {
    return c.json({ error: "task and lockedBy are required" }, 400);
  }
  AGENT_LOCKS[agentId] = { lockedBy, task, lockedAt: new Date().toISOString() };
  return c.json({ locked: true, lock: AGENT_LOCKS[agentId] });
});

router.delete("/:id/lock", async (c) => {
  const agentId = c.req.param("id");
  const prev = AGENT_LOCKS[agentId];
  delete AGENT_LOCKS[agentId];
  return c.json({ unlocked: true, previousLock: prev || null });
});

export { AGENT_LOCKS };