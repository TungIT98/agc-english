import { Hono } from "hono";
import type { Env } from "../index";

const router = new Hono<{ Bindings: Env }>();

interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  category: "budget" | "usage" | "performance" | "anomaly";
  title: string;
  description: string;
  recommendation: string;
  agentId?: string;
  metric?: string;
  threshold?: number;
  current?: number;
  actionLabel: string;
  actionHint: string;
}

router.get("/", async (c) => {
  const companyId = c.req.query("companyId") || "agc-english";
  const db = c.env.DB as D1Database;

  const alerts: Alert[] = [];

  try {
    // Gather spending data per agent
    const agentsResult = await db
      .prepare("SELECT id, name, role, budget_monthly_cents FROM agents WHERE company_id = ?")
      .bind(companyId)
      .all();

    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth;

    for (const row of agentsResult.results) {
      const agent = row as { id: string; name: string; role: string; budget_monthly_cents: number };

      // Get spent this month
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const costResult = await db
        .prepare(
          `SELECT COALESCE(SUM(cost_cents), 0) as spent FROM cost_events ce
           JOIN agents a ON ce.agent_id = a.id
           WHERE a.id = ? AND ce.created_at >= ?`
        )
        .bind(agent.id, startOfMonth)
        .first();
      const spent = (costResult as { spent: number } | null)?.spent ?? 0;
      const budget = agent.budget_monthly_cents;
      const spentRatio = spent / budget;

      // Alert: overspending relative to time
      if (spentRatio > monthProgress * 1.5 && spentRatio > 0.6) {
        const overspendPct = Math.round((spentRatio / monthProgress - 1) * 100);
        alerts.push({
          id: `overspend-${agent.id}`,
          severity: spentRatio > 0.9 ? "critical" : "warning",
          category: "budget",
          title: `${agent.name} trending over budget`,
          description: `Spent ${spent}/${budget}c (${Math.round(spentRatio * 100)}%) with ${Math.round(monthProgress * 100)}% of month elapsed.`,
          recommendation: `Consider reducing ${agent.role.toLowerCase()} agent usage or top up budget. Projected overspend: +${overspendPct}% this month.`,
          agentId: agent.id,
          metric: "spending_rate",
          threshold: monthProgress,
          current: spentRatio,
          actionLabel: "Top up budget",
          actionHint: "Add funds to prevent service interruption",
        });
      }

      // Alert: budget nearly exhausted
      if (spentRatio >= 0.9 && spentRatio < 1) {
        alerts.push({
          id: `depleted-${agent.id}`,
          severity: "critical",
          category: "budget",
          title: `${agent.name} budget nearly exhausted`,
          description: `Only ${budget - spent}c remaining (${Math.round((1 - spentRatio) * 100)}% left).`,
          recommendation: "Top up immediately to prevent agent downtime.",
          agentId: agent.id,
          metric: "budget_remaining",
          threshold: 0.1,
          current: 1 - spentRatio,
          actionLabel: "Top up now",
          actionHint: "Add at least 500c to restore service",
        });
      }

      // Alert: agent inactive for extended period
      const lastActivityResult = await db
        .prepare(
          `SELECT MAX(created_at) as last_activity FROM activity_log WHERE agent_id = ? AND event_type = 'agent_query'`
        )
        .bind(agent.id)
        .first();
      const lastActivity = (lastActivityResult as { last_activity: string | null } | null)?.last_activity;
      if (lastActivity) {
        const hoursSince = (now.getTime() - new Date(lastActivity).getTime()) / 3600000;
        if (hoursSince > 48 && agent.role !== "Branding") {
          // Branding is often paused
          alerts.push({
            id: `inactive-${agent.id}`,
            severity: "info",
            category: "usage",
            title: `${agent.name} inactive for ${Math.round(hoursSince)}h`,
            description: `No queries in ${Math.round(hoursSince)} hours. Agent may be underutilized.`,
            recommendation: "Consider delegating a task to activate this agent, or adjust autonomy level.",
            agentId: agent.id,
            metric: "last_activity_hours",
            threshold: 48,
            current: hoursSince,
            actionLabel: "Send task",
            actionHint: "Go to chat and delegate a task",
          });
        }
      }
    }

    // Cross-agent insights
    const totalResult = await db
      .prepare("SELECT COALESCE(SUM(cost_cents), 0) as total FROM cost_events ce JOIN agents a ON ce.agent_id = a.id WHERE a.company_id = ?")
      .bind(companyId)
      .first();
    const totalSpent = (totalResult as { total: number } | null)?.total ?? 0;

    const totalBudgetResult = await db
      .prepare("SELECT COALESCE(SUM(budget_monthly_cents), 0) as total FROM agents WHERE company_id = ?")
      .bind(companyId)
      .first();
    const totalBudget = (totalBudgetResult as { total: number } | null)?.total ?? 0;

    if (totalSpent / totalBudget > 0.8 && totalBudget > 0) {
      alerts.push({
        id: "company-overspend",
        severity: totalSpent / totalBudget > 0.95 ? "critical" : "warning",
        category: "budget",
        title: "Company-wide spending acceleration",
        description: `${totalSpent}c spent of ${totalBudget}c total monthly budget (${Math.round((totalSpent / totalBudget) * 100)}%).`,
        recommendation: `At current pace, total monthly spend will exceed budget by ${Math.round(totalSpent * (1 / monthProgress - 1))}c. Review top-spending agents.`,
        metric: "company_spend_rate",
        threshold: 0.8,
        current: totalSpent / totalBudget,
        actionLabel: "Review costs",
        actionHint: "View cost breakdown and rebalance budgets",
      });
    }

    // Sort: critical first, then warning, then info
    alerts.sort((a, b) => {
      const sevOrder = { critical: 0, warning: 1, info: 2 };
      return sevOrder[a.severity] - sevOrder[b.severity];
    });

    return c.json({ alerts, count: alerts.length });
  } catch {
    return c.json({ alerts: [], count: 0 });
  }
});

export const alertsRouter = router;