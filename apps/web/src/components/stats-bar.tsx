"use client";

import { useEffect, useState } from "react";
import { fetchAgents, fetchTasks, fetchCosts, fetchApprovals } from "@/lib/api";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "default" | "success" | "warning" | "error";
}

export function StatCard({ label, value, subtext, variant = "default" }: StatCardProps) {
  const colors = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-xs text-text-secondary uppercase mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors[variant]}`}>{value}</div>
      {subtext && <div className="text-xs text-text-secondary mt-1">{subtext}</div>}
    </div>
  );
}

interface Stats {
  activeCount: number;
  totalAgents: number;
  pendingTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  budgetPct: number;
  budgetSpent: number;
  budgetTotal: number;
  pendingApprovals: number;
}

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [agents, tasks, costs, approvals] = await Promise.all([
        fetchAgents(),
        fetchTasks(),
        fetchCosts(),
        fetchApprovals(),
      ]);
      const running = agents.filter((a) => a.status === "running").length;
      const pending = tasks.filter((t) => t.status === "pending").length;
      const inProgress = tasks.filter((t) => t.status === "in_progress").length;
      const done = tasks.filter((t) => t.status === "done").length;
      const pct = Math.round((costs.totalSpentCents / costs.totalBudgetCents) * 100);
      const pendingApprovals = approvals.filter((a) => a.status === "pending").length;
      setStats({
        activeCount: running,
        totalAgents: agents.length,
        pendingTasks: pending,
        inProgressTasks: inProgress,
        doneTasks: done,
        budgetPct: pct,
        budgetSpent: costs.totalSpentCents,
        budgetTotal: costs.totalBudgetCents,
        pendingApprovals,
      });
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active" value="—" subtext="Loading..." />
        <StatCard label="Tasks" value="—" subtext="Loading..." />
        <StatCard label="Budget" value="—" subtext="Loading..." />
        <StatCard label="Queue" value="—" subtext="Loading..." />
      </div>
    );
  }

  const budgetVariant = stats.budgetPct >= 100 ? "error" : stats.budgetPct >= 80 ? "warning" : "success";
  const activeVariant = stats.activeCount === stats.totalAgents ? "success" : stats.activeCount > 0 ? "warning" : "error";

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Active"
        value={`${stats.activeCount}/${stats.totalAgents}`}
        subtext={`${stats.activeCount === stats.totalAgents ? "All agents running" : `${stats.activeCount} agent(s) running`}`}
        variant={activeVariant}
      />
      <StatCard
        label="Tasks"
        value={stats.pendingTasks + stats.inProgressTasks + stats.doneTasks}
        subtext={`${stats.pendingTasks} pending, ${stats.inProgressTasks} in progress, ${stats.doneTasks} done`}
      />
      <StatCard
        label="Budget"
        value={`${stats.budgetPct}%`}
        subtext={`$${(stats.budgetSpent / 100).toFixed(2)} / $${(stats.budgetTotal / 100).toFixed(2)}`}
        variant={budgetVariant}
      />
      <StatCard
        label="Queue"
        value={stats.pendingApprovals}
        subtext={stats.pendingApprovals === 0 ? "All clear" : `Awaiting approval`}
        variant={stats.pendingApprovals > 0 ? "warning" : "success"}
      />
    </div>
  );
}