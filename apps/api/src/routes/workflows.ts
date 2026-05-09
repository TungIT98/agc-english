import { Hono } from "hono";
import type { Env } from "../index";

const router = new Hono<{ Bindings: Env }>();

interface WorkflowStep {
  order: number;
  agent: string;
  action: string;
  trigger: string;
}

// POST /api/workflows/generate — parse natural language into workflow steps
router.post("/generate", async (c) => {
  const { description, agents } = await c.req.json<{
    description?: string;
    agents?: { id: string; name: string; role: string }[];
  }>();

  if (!description?.trim()) {
    return c.json({ error: "Description is required" }, 400);
  }

  const desc = description.toLowerCase();

  // Detect workflow pattern from natural language
  const steps: WorkflowStep[] = [];
  let stepOrder = 1;

  // Pattern: customer support flow (CSKH → Sales on upgrade interest)
  if (
    desc.includes("khách") || desc.includes("customer") || desc.includes("hỗ trợ") ||
    desc.includes("complaint") || desc.includes("refund") || desc.includes("hoàn tiền")
  ) {
    if (desc.includes("bán") || desc.includes("sell") || desc.includes("nâng cấp") || desc.includes("upgrade")) {
      steps.push({ order: stepOrder++, agent: "cskh", action: "handle_ticket", trigger: "customer_request" });
      steps.push({ order: stepOrder++, agent: "sales", action: "follow_up", trigger: "upgrade_interest" });
    } else if (desc.includes("hoàn tiền") || desc.includes("refund")) {
      steps.push({ order: stepOrder++, agent: "cskh", action: "process_refund", trigger: "refund_request" });
      steps.push({ order: stepOrder++, agent: "ceo", action: "approve", trigger: "refund_over_threshold" });
    } else {
      steps.push({ order: stepOrder++, agent: "cskh", action: "respond", trigger: "customer_message" });
    }
  }

  // Pattern: content pipeline (Brief → Draft → Review → Publish)
  if (
    desc.includes("nội dung") || desc.includes("content") || desc.includes("bài viết") ||
    desc.includes("post") || desc.includes("social") || desc.includes("facebook") ||
    desc.includes("marketing")
  ) {
    steps.push({ order: stepOrder++, agent: "ceo", action: "brief", trigger: "content_brief" });
    steps.push({ order: stepOrder++, agent: "content", action: "create_draft", trigger: "brief_received" });
    steps.push({ order: stepOrder++, agent: "branding", action: "review", trigger: "draft_complete" });
    steps.push({ order: stepOrder++, agent: "ceo", action: "publish", trigger: "approved" });
  }

  // Pattern: training flow
  if (desc.includes("học") || desc.includes("training") || desc.includes("đánh giá") || desc.includes("assessment")) {
    steps.push({ order: stepOrder++, agent: "training", action: "create_plan", trigger: "student_enrolled" });
    steps.push({ order: stepOrder++, agent: "training", action: "assign_lesson", trigger: "plan_ready" });
  }

  // Pattern: sales/lead flow
  if (desc.includes("bán") || desc.includes("sale") || desc.includes("lead") || desc.includes("khách hàng tiềm năng")) {
    steps.push({ order: stepOrder++, agent: "sales", action: "qualify_lead", trigger: "new_lead" });
    steps.push({ order: stepOrder++, agent: "sales", action: "propose", trigger: "lead_qualified" });
    steps.push({ order: stepOrder++, agent: "ceo", action: "approve_deal", trigger: "proposal_sent" });
  }

  // Pattern: onboarding flow
  if (desc.includes("onboard") || desc.includes("tiếp nhận") || desc.includes("welcome") || desc.includes("bắt đầu")) {
    steps.push({ order: stepOrder++, agent: "ceo", action: "welcome", trigger: "new_student" });
    steps.push({ order: stepOrder++, agent: "training", action: "assess", trigger: "welcome_sent" });
    steps.push({ order: stepOrder++, agent: "sales", action: "follow_up", trigger: "assessment_done" });
  }

  // Default: if no patterns matched, create a simple single-agent workflow
  if (steps.length === 0) {
    steps.push({ order: 1, agent: "ceo", action: "analyze_and_respond", trigger: "user_request" });
  }

  const workflow = {
    name: generateWorkflowName(description),
    description,
    steps,
    generatedAt: new Date().toISOString(),
  };

  return c.json({ workflow }, 201);
});

// GET /api/workflows/templates — list pre-built workflow templates
router.get("/templates", async (c) => {
  return c.json({
    templates: [
      {
        id: "customer-support",
        name: "Customer Support Flow",
        description: "CSKH handles ticket → escalates to Sales for upsell or CEO for refund approval",
        steps: [
          { order: 1, agent: "cskh", action: "handle_ticket", trigger: "customer_request" },
          { order: 2, agent: "sales", action: "follow_up", trigger: "upgrade_interest" },
          { order: 3, agent: "ceo", action: "approve", trigger: "refund_over_threshold" },
        ],
      },
      {
        id: "content-pipeline",
        name: "Content Pipeline",
        description: "CEO briefs → Content drafts → Branding reviews → CEO approves and publishes",
        steps: [
          { order: 1, agent: "ceo", action: "brief", trigger: "content_brief" },
          { order: 2, agent: "content", action: "create_draft", trigger: "brief_received" },
          { order: 3, agent: "branding", action: "review", trigger: "draft_complete" },
          { order: 4, agent: "ceo", action: "publish", trigger: "approved" },
        ],
      },
      {
        id: "student-onboarding",
        name: "Student Onboarding",
        description: "Welcome → Assessment → Personalized plan → Follow-up",
        steps: [
          { order: 1, agent: "ceo", action: "welcome", trigger: "new_student" },
          { order: 2, agent: "training", action: "assess_level", trigger: "welcome_sent" },
          { order: 3, agent: "training", action: "create_plan", trigger: "assessment_done" },
          { order: 4, agent: "sales", action: "follow_up", trigger: "plan_ready" },
        ],
      },
      {
        id: "sales-lead",
        name: "Sales Lead Pipeline",
        description: "Qualify lead → Propose → CEO approval → Close",
        steps: [
          { order: 1, agent: "sales", action: "qualify_lead", trigger: "new_lead" },
          { order: 2, agent: "sales", action: "prepare_proposal", trigger: "lead_qualified" },
          { order: 3, agent: "ceo", action: "approve_deal", trigger: "proposal_ready" },
          { order: 4, agent: "sales", action: "close", trigger: "approved" },
        ],
      },
    ],
  });
});

function generateWorkflowName(description: string): string {
  const words = description.trim().split(/\s+/).slice(0, 4);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Workflow";
}

export const workflowsRouter = router;