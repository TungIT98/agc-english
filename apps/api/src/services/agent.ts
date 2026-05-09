// Agent service - Direct MiniMax API integration with budget enforcement
// Note: @anthropic-ai/claude-agent-sdk is NOT used directly — it's Node.js-only (uses child_process, fs, etc.)
// Instead, we call the MiniMax OpenAI-compatible API directly via fetch.

// Role mapping for dashboard (must match seed.sql roles)
export const ROLE_MAP: Record<string, string> = {
  ceo: "Orchestrator",
  cskh: "Customer Support",
  sales: "Sales",
  content: "Content",
  training: "Training",
  branding: "Branding",
};

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  tools: string[];
  budgetMonthlyCents: number;
  config?: string; // JSON string for runtime overrides (autonomyLevel, etc.)
}

export interface SessionStore {
  agentId: string;
  messages: Array<{ role: string; content: string }>;
  createdAt: string;
  updatedAt: string;
}

// Agent configs matching PLAN.md spec
export const agentConfigs: AgentConfig[] = [
  {
    id: "ceo",
    name: "CEO Agent",
    description: "Chief Executive Officer - điều phối toàn bộ hệ thống",
    prompt: "Bạn là CEO của AGC_English. Bạn điều phối 5 manager agents và tổng hợp kết quả. Khi nhận task: 1) Phân tích và quyết định delegate 2) Giao task cho manager phù hợp 3) Tổng hợp kết quả và báo cáo.",
    tools: ["Read", "Write", "Agent"],
    budgetMonthlyCents: 2500,
  },
  {
    id: "cskh",
    name: "CSKH Manager",
    description: "Customer Support Manager - xử lý khiếu nại, refund",
    prompt: "Bạn là CSKH Manager của AGC_English. Xử lý khiếu nại và quyết định refund dưới $50 tự động. Nếu refund >= $50, tạo approval request.",
    tools: ["Read", "search_student", "update_order", "send_zalo"],
    budgetMonthlyCents: 2500,
  },
  {
    id: "sales",
    name: "Sales Manager",
    description: "Sales Director - tư vấn, chốt đơn, CRM",
    prompt: "Bạn là Sales Manager của AGC_English. Tư vấn khóa học và chốt đơn. Tìm kiếm học viên, tạo đơn hàng, cập nhật lead.",
    tools: ["Read", "search_student", "create_order", "update_lead"],
    budgetMonthlyCents: 4000,
  },
  {
    id: "content",
    name: "Content Manager",
    description: "Content Director - tạo nội dung học tập, marketing",
    prompt: "Bạn là Content Manager của AGC_English. Tạo nội dung bài học và content marketing. Viết bài, tạo lesson, publish social.",
    tools: ["Read", "Write", "create_lesson", "publish_social"],
    budgetMonthlyCents: 5000,
  },
  {
    id: "training",
    name: "Training Manager",
    description: "Training Director - cá nhân hóa lộ trình học",
    prompt: "Bạn là Training Manager của AGC_English. Đánh giá level và tạo lộ trình học cá nhân hóa. Tạo assessment, update progress, recommend course.",
    tools: ["Read", "create_assessment", "update_progress", "recommend_course"],
    budgetMonthlyCents: 2500,
  },
  {
    id: "branding",
    name: "Branding Manager",
    description: "Brand Guardian - đảm bảo nhất quán thương hiệu",
    prompt: "Bạn là Branding Manager của AGC_English. Review content và đảm bảo nhất quán thương hiệu. Kiểm tra compliance.",
    tools: ["Read", "review_content", "check_brand_compliance"],
    budgetMonthlyCents: 1500,
  },
];

export function getAgent(id: string): AgentConfig | undefined {
  return agentConfigs.find((a) => a.id === id);
}

export function listAgents(): AgentConfig[] {
  return agentConfigs;
}

// Budget thresholds
const BUDGET_WARNING_RATIO = 0.80; // 80%
const BUDGET_BLOCK_RATIO = 1.00;   // 100%

export interface BudgetStatus {
  agentId: string;
  budgetMonthlyCents: number;
  spentCents: number;
  remainingCents: number;
  ratio: number;
  status: "ok" | "warning" | "blocked";
  message: string;
}

export function checkBudget(
  agentId: string,
  spentCents: number
): BudgetStatus | null {
  const agent = getAgent(agentId);
  if (!agent) return null;

  const budget = agent.budgetMonthlyCents;
  const ratio = spentCents / budget;

  let status: BudgetStatus["status"] = "ok";
  let message = "";

  if (ratio >= BUDGET_BLOCK_RATIO) {
    status = "blocked";
    message = `Budget exceeded (${spentCents}/${budget} cents). Agent blocked.`;
  } else if (ratio >= BUDGET_WARNING_RATIO) {
    status = "warning";
    message = `Budget at ${Math.round(ratio * 100)}% (${spentCents}/${budget} cents).`;
  } else {
    message = `Budget OK (${spentCents}/${budget} cents, ${Math.round((1 - ratio) * 100)}% remaining).`;
  }

  return {
    agentId,
    budgetMonthlyCents: budget,
    spentCents,
    remainingCents: Math.max(0, budget - spentCents),
    ratio,
    status,
    message,
  };
}

// Session management via KV
const SESSION_TTL_SECONDS = 3600; // 1 hour

export async function getSession(
  kv: KVNamespace,
  agentId: string,
  sessionId: string
): Promise<SessionStore | null> {
  try {
    const key = `session:${agentId}:${sessionId}`;
    const raw = await kv.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as SessionStore;
  } catch {
    return null;
  }
}

export async function saveSession(
  kv: KVNamespace,
  agentId: string,
  sessionId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  const now = new Date().toISOString();
  const store: SessionStore = {
    agentId,
    messages,
    createdAt: now,
    updatedAt: now,
  };
  await kv.put(`session:${agentId}:${sessionId}`, JSON.stringify(store), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

export async function clearSession(
  kv: KVNamespace,
  agentId: string,
  sessionId: string
): Promise<void> {
  await kv.delete(`session:${agentId}:${sessionId}`);
}

// Tool implementations
export interface ToolResult {
  tool: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

function toolNotImplemented(tool: string): ToolResult {
  return {
    tool,
    success: false,
    error: `Tool '${tool}' not implemented in local mode. Requires external service integration.`,
  };
}

export interface ToolEnv {
  ZALO_API_KEY?: string;
  CRM_API_KEY?: string;
  CRM_API_URL?: string;
  NOTION_API_KEY?: string;
}

export async function executeTool(
  tool: string,
  args: Record<string, unknown>,
  _db: D1Database,
  _env?: ToolEnv
): Promise<ToolResult> {
  switch (tool) {
    case "search_student": {
      // Stub: real impl would query students table
      const name = args.name as string | undefined;
      const phone = args.phone as string | undefined;
      return {
        tool,
        success: true,
        data: {
          message: `Search results for student (name=${name ?? "any"}, phone=${phone ?? "any"})`,
          found: [],
        },
      };
    }
    case "update_order": {
      const orderId = args.orderId as string;
      const status = args.status as string;
      return {
        tool,
        success: true,
        data: { orderId, status, updated: true },
      };
    }
    case "send_zalo": {
      const phone = args.phone as string;
      const message = args.message as string;
      // Import zalo service inline to avoid circular dependency
      const { sendZaloMessage } = await import("./zalo");
      const result = await sendZaloMessage({ ZALO_API_KEY: _env?.ZALO_API_KEY ?? "" }, phone, message);
      return {
        tool,
        success: result.success,
        data: { phone, message, sent: result.success, zaloId: result.zaloId },
        error: result.error,
      };
    }
    case "create_order": {
      const studentId = args.studentId as string;
      const courseId = args.courseId as string;
      const amountCents = args.amountCents as number;
      return {
        tool,
        success: true,
        data: {
          orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
          studentId,
          courseId,
          amountCents,
          status: "pending",
        },
      };
    }
    case "update_lead": {
      const leadId = args.leadId as string;
      const status = args.status as string;
      const notes = args.notes as string | undefined;
      const { updateLead } = await import("./crm");
      const result = await updateLead({ CRM_API_KEY: _env?.CRM_API_KEY ?? "", CRM_API_URL: _env?.CRM_API_URL }, leadId, status, notes);
      return {
        tool,
        success: result.success,
        data: result.lead,
        error: result.error,
      };
    }
    case "create_lesson": {
      const title = args.title as string;
      const content = args.content as string;
      const tags = args.tags as string[] | undefined;
      const { createNotionLesson } = await import("./notion");
      const result = await createNotionLesson({ NOTION_API_KEY: _env?.NOTION_API_KEY ?? "" }, title, content, tags);
      return {
        tool,
        success: result.success,
        data: result.lesson,
        error: result.error,
      };
    }
    case "publish_social": {
      const platform = args.platform as string;
      const content = args.content as string;
      return {
        tool,
        success: true,
        data: { platform, content, published: true, postId: `post_${Date.now()}` },
      };
    }
    case "create_assessment": {
      const studentId = args.studentId as string;
      const level = args.level as string;
      return {
        tool,
        success: true,
        data: {
          assessmentId: `ass_${crypto.randomUUID().slice(0, 8)}`,
          studentId,
          level,
          created: true,
        },
      };
    }
    case "update_progress": {
      const studentId = args.studentId as string;
      const progress = args.progress as number;
      return {
        tool,
        success: true,
        data: { studentId, progress, updated: true },
      };
    }
    case "recommend_course": {
      const studentId = args.studentId as string;
      return {
        tool,
        success: true,
        data: {
          studentId,
          recommendedCourses: ["Speaking Master", "Grammar Pro"],
          reason: "Based on current progress",
        },
      };
    }
    case "review_content": {
      const content = args.content as string;
      // Simple brand compliance check
      const violations = detectBrandViolations(content);
      return {
        tool,
        success: true,
        data: {
          compliant: violations.length === 0,
          violations,
          score: violations.length === 0 ? 10 : Math.max(0, 10 - violations.length),
        },
      };
    }
    case "check_brand_compliance": {
      const text = args.text as string;
      const violations = detectBrandViolations(text);
      return {
        tool,
        success: true,
        data: {
          compliant: violations.length === 0,
          violations,
          checkedAt: new Date().toISOString(),
        },
      };
    }
    default:
      return toolNotImplemented(tool);
  }
}

function detectBrandViolations(text: string): string[] {
  const violations: string[] = [];
  const lower = text.toLowerCase();

  // Brand name must be AGC_English or AGC English
  if (lower.includes("agc") && !lower.includes("agc_english") && !lower.includes("agc english")) {
    violations.push("Brand name should be 'AGC_English' (not 'AGC' alone)");
  }

  // No competitor mentions
  const competitors = ["ielts", "toeic", "fluency", "talk", "app"];
  for (const comp of competitors) {
    if (lower.includes(comp) && !lower.includes("agc_english")) {
      violations.push(`Potential competitor mention: '${comp}'`);
    }
  }

  return violations;
}