import { Agent } from "@/lib/api";
import { Bot } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "var(--text-secondary)",
  running: "var(--success)",
  paused: "var(--error)",
};

const ROLE_COLORS: Record<string, string> = {
  Orchestrator: "#6366f1",
  "Customer Support": "#22c55e",
  Sales: "#f59e0b",
  Content: "#8b5cf6",
  Training: "#06b6d4",
  Branding: "#ec4899",
};

export default function AgentCard({ agent }: AgentCardProps) {
  const roleColor = ROLE_COLORS[agent.role] || "var(--primary)";
  const budgetPct = Math.min(100, Math.round((agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100));
  const barColor = budgetPct >= 100 ? "var(--error)" : budgetPct >= 80 ? "var(--warning)" : "var(--success)";

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-lg border"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full"
          style={{ backgroundColor: roleColor }}
        >
          <Bot size={18} color="white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {agent.name}
          </span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {agent.role}
          </span>
        </div>
        <div className="ml-auto">
          <span
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{
              backgroundColor: `${STATUS_COLORS[agent.status]}22`,
              color: STATUS_COLORS[agent.status],
            }}
          >
            {agent.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
          <span>Budget</span>
          <span style={{ color: barColor }}>{budgetPct}%</span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--border)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, budgetPct)}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Last active: {agent.lastActivity}
      </div>
    </div>
  );
}
