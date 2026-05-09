const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://agc-english-api.thanhtungtran364.workers.dev";

export interface Agent {
  id: string;
  name: string;
  role: string;
  description?: string;
  status: "idle" | "running" | "paused";
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  lastActivity: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "done" | "blocked";
  priority: number;
  assigneeAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CostSummary {
  totalSpentCents: number;
  totalBudgetCents: number;
  byAgent: { agentId: string; spentCents: number; budgetCents: number }[];
}

export interface BudgetStatus {
  status: "ok" | "warning" | "blocked";
  spentCents: number;
  budgetMonthlyCents: number;
  message: string;
}

export interface Approval {
  id: string;
  taskId: string;
  title: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export async function fetchAgents(): Promise<Agent[]> {
  try {
    const res = await fetch(`${API_BASE}/api/agents`);
    if (!res.ok) throw new Error("Failed to fetch agents");
    return await res.json();
  } catch {
    // Return mock data when API is unavailable
    return [
      { id: "ceo", name: "CEO Agent", role: "Orchestrator", status: "running", budgetMonthlyCents: 2500, spentMonthlyCents: 1200, lastActivity: "2m ago" },
      { id: "cskh", name: "CSKH Manager", role: "Customer Support", status: "running", budgetMonthlyCents: 2500, spentMonthlyCents: 1800, lastActivity: "5m ago" },
      { id: "sales", name: "Sales Manager", role: "Sales", status: "idle", budgetMonthlyCents: 4000, spentMonthlyCents: 900, lastActivity: "12m ago" },
      { id: "content", name: "Content Manager", role: "Content", status: "running", budgetMonthlyCents: 5000, spentMonthlyCents: 3200, lastActivity: "1m ago" },
      { id: "training", name: "Training Manager", role: "Training", status: "idle", budgetMonthlyCents: 2500, spentMonthlyCents: 600, lastActivity: "30m ago" },
      { id: "branding", name: "Branding Manager", role: "Branding", status: "paused", budgetMonthlyCents: 1500, spentMonthlyCents: 1500, lastActivity: "1h ago" },
    ];
  }
}

export async function fetchTasks(): Promise<Task[]> {
  try {
    const res = await fetch(`${API_BASE}/api/tasks`);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return await res.json();
  } catch {
    return [
      { id: "1", title: "Review Q2 content calendar", status: "pending", priority: 1, createdAt: "2026-05-08T10:00:00Z", updatedAt: "2026-05-08T10:00:00Z" },
      { id: "2", title: "Process refund request #4421", status: "in_progress", priority: 2, assigneeAgentId: "cskh", createdAt: "2026-05-08T09:30:00Z", updatedAt: "2026-05-08T10:15:00Z" },
      { id: "3", title: "Create onboarding email sequence", status: "pending", priority: 1, createdAt: "2026-05-08T08:00:00Z", updatedAt: "2026-05-08T08:00:00Z" },
      { id: "4", title: "Update student progress report", status: "done", priority: 0, assigneeAgentId: "training", createdAt: "2026-05-07T14:00:00Z", updatedAt: "2026-05-08T09:00:00Z" },
      { id: "5", title: "Draft social media posts", status: "in_progress", priority: 1, assigneeAgentId: "content", createdAt: "2026-05-08T07:00:00Z", updatedAt: "2026-05-08T10:30:00Z" },
      { id: "6", title: "Approve logo redesign", status: "pending", priority: 2, createdAt: "2026-05-08T11:00:00Z", updatedAt: "2026-05-08T11:00:00Z" },
    ];
  }
}

export async function fetchCosts(): Promise<CostSummary> {
  try {
    const res = await fetch(`${API_BASE}/api/costs/summary`);
    if (!res.ok) throw new Error("Failed to fetch costs");
    return await res.json();
  } catch {
    return {
      totalSpentCents: 8200,
      totalBudgetCents: 18000,
      byAgent: [
        { agentId: "ceo", spentCents: 1200, budgetCents: 2500 },
        { agentId: "cskh", spentCents: 1800, budgetCents: 2500 },
        { agentId: "sales", spentCents: 900, budgetCents: 4000 },
        { agentId: "content", spentCents: 3200, budgetCents: 5000 },
        { agentId: "training", spentCents: 600, budgetCents: 2500 },
        { agentId: "branding", spentCents: 1500, budgetCents: 1500 },
      ],
    };
  }
}

export async function fetchApprovals(): Promise<Approval[]> {
  try {
    const res = await fetch(`${API_BASE}/api/approvals`);
    if (!res.ok) throw new Error("Failed to fetch approvals");
    const data = await res.json();
    // Handle both { approvals: [...] } and flat array response
    return Array.isArray(data) ? data : (data.approvals ?? []);
  } catch {
    return [
      { id: "apr1", taskId: "1", title: "Refund request #4421 ($65)", requestedBy: "CSKH Manager", status: "pending", createdAt: "2026-05-08T10:15:00Z" },
      { id: "apr2", taskId: "2", title: "Logo redesign approval", requestedBy: "Content Manager", status: "pending", createdAt: "2026-05-08T11:00:00Z" },
    ];
  }
}

export async function approveApproval(approvalId: string): Promise<void> {
  await fetch(`${API_BASE}/api/approvals/${approvalId}/approve`, { method: "POST" });
}

export async function rejectApproval(approvalId: string): Promise<void> {
  await fetch(`${API_BASE}/api/approvals/${approvalId}/reject`, { method: "POST" });
}

export async function createTask(data: { title: string; description?: string; priority?: number }): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create task");
  const result = await res.json();
  return result.task ?? result;
}

export async function updateTask(taskId: string, data: Partial<Task>): Promise<void> {
  await fetch(`${API_BASE}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function pauseAgent(agentId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/pause`, { method: "POST" });
  return res.json();
}

export async function resumeAgent(agentId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/resume`, { method: "POST" });
  return res.json();
}

export async function fetchForecast(): Promise<{
  totalSpentCents: number;
  dailyAvgCents: number;
  projectedTotalCents: number;
  remainingDays: number;
  remainingBudgetCents: number;
  projectedOverspendCents: number;
}> {
  const res = await fetch(`${API_BASE}/api/costs/forecast`);
  if (!res.ok) throw new Error("Failed to fetch forecast");
  return res.json();
}

export interface TrendPoint {
  day: string;
  spend: number;
}

export async function fetchTrend(days = 7): Promise<TrendPoint[]> {
  const res = await fetch(`${API_BASE}/api/costs/trend?days=${days}`);
  if (!res.ok) throw new Error("Failed to fetch trend");
  const data = await res.json();
  return data.trend ?? [];
}

export async function topUpBudget(agentId: string, amountCents: number): Promise<void> {
  await fetch(`${API_BASE}/api/costs/top-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, amountCents }),
  });
}

export async function transferBudget(fromAgentId: string, toAgentId: string, amountCents: number): Promise<void> {
  await fetch(`${API_BASE}/api/costs/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromAgentId, toAgentId, amountCents }),
  });
}

export interface AutonomyLevel {
  agentId: string;
  level: string;
  label: string;
  description: string;
}

export async function fetchAgentAutonomy(agentId: string): Promise<AutonomyLevel> {
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/autonomy`);
  if (!res.ok) throw new Error("Failed to fetch autonomy");
  return res.json();
}

export async function setAgentAutonomy(agentId: string, level: string): Promise<void> {
  await fetch(`${API_BASE}/api/agents/${agentId}/autonomy`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level }),
  });
}

export interface SessionReplay {
  query: {
    id: string;
    description: string;
    metadata: { inputTokens?: number; outputTokens?: number; costCents?: number };
    createdAt: string;
  };
  steps: {
    id: string;
    description: string;
    metadata: { step?: string; parentId?: string; order?: number };
    createdAt: string;
  }[];
}

export interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  category: "budget" | "usage" | "performance" | "anomaly";
  title: string;
  description: string;
  recommendation: string;
  agentId?: string;
  metric?: string;
  actionLabel: string;
  actionHint: string;
}

export async function fetchAlerts(): Promise<{ alerts: Alert[]; count: number }> {
  const res = await fetch(`${API_BASE}/api/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function fetchAgentSessions(agentId: string): Promise<SessionReplay[]> {
  const res = await fetch(`${API_BASE}/api/activity/sessions/${agentId}`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  const data = await res.json();
  return data.sessions ?? [];
}

export async function fetchReplaySteps(activityId: string): Promise<SessionReplay["steps"]> {
  const res = await fetch(`${API_BASE}/api/activity/steps/${activityId}`);
  if (!res.ok) throw new Error("Failed to fetch steps");
  const data = await res.json();
  return data.steps ?? [];
}

export interface GovernanceStats {
  totalAgents: number;
  activeAgents: number;
  blockedAgents: number;
  governanceEvents: number;
  totalMonthlyBudgetCents: number;
}

export interface GovernanceAgent {
  id: string;
  name: string;
  role: string;
  status: string;
  enabled: boolean;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  createdAt: string;
  creatorName: string;
  totalEvents: number;
  lastQueryAt: string | null;
}

export interface GovernanceAuditEntry {
  id: string;
  agentId: string | null;
  agentName: string;
  eventType: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function fetchGovernanceStats(): Promise<GovernanceStats> {
  const res = await fetch(`${API_BASE}/api/governance/stats`);
  if (!res.ok) throw new Error("Failed to fetch governance stats");
  return res.json();
}

export async function fetchGovernanceAgents(): Promise<GovernanceAgent[]> {
  const res = await fetch(`${API_BASE}/api/governance/agents`);
  if (!res.ok) throw new Error("Failed to fetch governance agents");
  const data = await res.json();
  return data.agents ?? [];
}

export async function updateGovernanceAgent(agentId: string, action: string): Promise<void> {
  await fetch(`${API_BASE}/api/governance/agents/${agentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

export async function fetchGovernanceAudit(limit = 50): Promise<GovernanceAuditEntry[]> {
  const res = await fetch(`${API_BASE}/api/governance/audit?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch audit log");
  const data = await res.json();
  return data.entries ?? [];
}

export interface WorkflowStep {
  order: number;
  agent: string;
  action: string;
  trigger: string;
}

export interface GeneratedWorkflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  generatedAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface AgentLock {
  locked: boolean;
  lock: { lockedBy: string; task: string; lockedAt: string } | null;
}

export async function fetchAgentLock(agentId: string): Promise<AgentLock> {
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/lock`);
  if (!res.ok) throw new Error("Failed to fetch lock");
  return res.json();
}

export async function lockAgent(agentId: string, task: string, lockedBy: string): Promise<void> {
  await fetch(`${API_BASE}/api/agents/${agentId}/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, lockedBy }),
  });
}

export async function unlockAgent(agentId: string): Promise<void> {
  await fetch(`${API_BASE}/api/agents/${agentId}/lock`, { method: "DELETE" });
}

export async function generateWorkflowFromNL(description: string, agents: { id: string; name: string; role: string }[]): Promise<GeneratedWorkflow> {
  const res = await fetch(`${API_BASE}/api/workflows/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, agents }),
  });
  if (!res.ok) throw new Error("Failed to generate workflow");
  const data = await res.json();
  return data.workflow;
}

export async function fetchWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const res = await fetch(`${API_BASE}/api/workflows/templates`);
  if (!res.ok) throw new Error("Failed to fetch templates");
  const data = await res.json();
  return data.templates ?? [];
}

export interface IntentStep {
  id: string;
  icon: string;
  action: string;
  detail: string;
  risk: "safe" | "caution" | "action";
}

export async function previewAgentQuery(
  agentId: string,
  prompt: string
): Promise<{ intents: IntentStep[]; previewId: string }> {
  const res = await fetch(`${API_BASE}/api/agents/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, prompt }),
  });
  if (!res.ok) throw new Error("Preview failed");
  return res.json();
}

export async function queryAgent(
  agentId: string,
  prompt: string,
  previewId?: string
): Promise<{ result: string; budget?: BudgetStatus }> {
  const res = await fetch(`${API_BASE}/api/agents/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, prompt, previewId }),
  });
  if (!res.ok) throw new Error("Agent query failed");
  return res.json();
}

// YouTube Data API v3

export interface YouTubeChannelStats {
  channelId: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  hiddenSubscriberCount: boolean;
  latestVideoId: string | null;
  source: "live" | "unconfigured";
  note?: string;
}

export interface YouTubeEligibility {
  channelId: string;
  subscriberCount: number;
  watchHours: number;
  watchHoursMethod: string;
  subsRequirementMet: boolean;
  watchHoursRequirementMet: boolean;
  monetizationEligible: boolean;
  requirements: { minSubscribers: number; minWatchHours: number };
  source: "live" | "unconfigured";
}

export interface AffiliateClick {
  id: string;
  videoUrl: string;
  linkUrl: string;
  affiliateProgram: string | null;
  merchant: string | null;
  clickedAt: string;
}

export interface AffiliateStats {
  totalClicks: number;
  byProgram: { affiliate_program: string; click_count: number }[];
  byVideo: { video_url: string; click_count: number }[];
  daily: { day: string; clicks: number }[];
}

export async function fetchYouTubeStats(channelId: string): Promise<YouTubeChannelStats> {
  const res = await fetch(`${API_BASE}/api/youtube/channel/${encodeURIComponent(channelId)}/stats`);
  if (!res.ok) throw new Error("Failed to fetch YouTube stats");
  return res.json();
}

export async function fetchYouTubeEligibility(channelId: string): Promise<YouTubeEligibility> {
  const res = await fetch(`${API_BASE}/api/youtube/channel/${encodeURIComponent(channelId)}/eligibility`);
  if (!res.ok) throw new Error("Failed to fetch eligibility");
  return res.json();
}

export async function fetchAffiliateClicks(params?: {
  agentId?: string;
  program?: string;
  limit?: number;
  offset?: number;
}): Promise<{ clicks: AffiliateClick[]; count: number; limit: number; offset: number }> {
  const qs = new URLSearchParams();
  if (params?.agentId) qs.set("agentId", params.agentId);
  if (params?.program) qs.set("program", params.program);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const res = await fetch(`${API_BASE}/api/youtube/affiliate/clicks?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch affiliate clicks");
  return res.json();
}

export async function fetchAffiliateStats(): Promise<AffiliateStats> {
  const res = await fetch(`${API_BASE}/api/youtube/affiliate/stats`);
  if (!res.ok) throw new Error("Failed to fetch affiliate stats");
  return res.json();
}

export async function logAffiliateClick(data: {
  agentId?: string;
  videoUrl: string;
  linkUrl: string;
  affiliateProgram?: string;
  merchant?: string;
}): Promise<void> {
  await fetch(`${API_BASE}/api/youtube/affiliate/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
