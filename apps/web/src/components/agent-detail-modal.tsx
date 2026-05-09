"use client";

import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Agent } from "@/lib/api";

interface AgentDetailModalProps {
  agent: Agent | null;
  onClose: () => void;
}

export function AgentDetailModal({ agent, onClose }: AgentDetailModalProps) {
  if (!agent) return null;

  const pct = Math.round((agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100);
  const barColor = pct >= 100 ? "var(--error)" : pct >= 80 ? "var(--warning)" : "var(--success)";
  const statusColor = agent.status === "running" ? "var(--success)" : agent.status === "paused" ? "var(--error)" : "var(--text-secondary)";

  return (
    <Dialog open={!!agent} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <DialogTitle>{agent.name}</DialogTitle>
          <Badge variant={agent.status === "running" ? "success" : agent.status === "paused" ? "error" : "outline"}>
            {agent.status.toUpperCase()}
          </Badge>
        </div>
        <DialogDescription>{agent.role}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 mt-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-text-secondary mb-1">Budget</div>
            <div className="font-medium">${(agent.budgetMonthlyCents / 100).toFixed(2)} dollars/month</div>
          </div>
          <div>
            <div className="text-text-secondary mb-1">Spent</div>
            <div className="font-medium" style={{ color: barColor }}>${(agent.spentMonthlyCents / 100).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-text-secondary mb-1">Usage</div>
            <div className="font-medium">{pct}%</div>
          </div>
          <div>
            <div className="text-text-secondary mb-1">Last Activity</div>
            <div className="font-medium">{agent.lastActivity}</div>
          </div>
        </div>

        <div>
          <div className="text-sm text-text-secondary mb-1">Budget Usage</div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: Math.min(100, pct) + "%", backgroundColor: barColor }}
            />
          </div>
          <div className="flex justify-between text-xs text-text-secondary mt-1">
            <span>${(agent.spentMonthlyCents / 100).toFixed(2)} spent</span>
            <span>${(agent.budgetMonthlyCents / 100).toFixed(2)} budget</span>
          </div>
        </div>

        <div>
          <div className="text-sm text-text-secondary mb-1">Agent Role</div>
          <Badge variant="outline">{agent.role}</Badge>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded text-sm font-medium border border-border hover:bg-surface transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}