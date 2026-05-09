"use client";

import { useEffect, useState } from "react";
import { fetchAgents, Agent, pauseAgent, resumeAgent, fetchAgentLock } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AgentDetailModal } from "@/components/agent-detail-modal";
import { WorkflowCanvas } from "@/components/workflow-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  Orchestrator: "#8b5cf6",
  "Customer Support": "#34d399",
  Sales: "#fbbf24",
  Content: "#a78bfa",
  Training: "#22d3ee",
  Branding: "#fb7185",
};

function getConfidence(agent: Agent): { label: string; variant: "success" | "warning" | "error" } {
  const pct = agent.spentMonthlyCents / agent.budgetMonthlyCents;
  if (pct >= 1) return { label: "Over Budget", variant: "error" as const };
  if (pct >= 0.8) return { label: "Caution", variant: "warning" as const };
  return { label: "Healthy", variant: "success" as const };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<(Agent & { locked?: boolean; lockInfo?: { lockedBy: string; task: string } })[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents().then(async (agts) => {
      // Fetch lock status for all agents
      const withLocks = await Promise.all(
        agts.map(async (a) => {
          try {
            const lock = await fetchAgentLock(a.id);
            return { ...a, locked: lock.locked, lockInfo: lock.lock ? { lockedBy: lock.lock.lockedBy, task: lock.lock.task } : undefined };
          } catch {
            return a;
          }
        })
      );
      setAgents(withLocks);
    });
  }, []);

  async function handlePauseResume(agentId: string, currentStatus: string) {
    setLoadingId(agentId);
    try {
      if (currentStatus === "paused") {
        await resumeAgent(agentId);
        setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, status: "running" } : a));
      } else {
        await pauseAgent(agentId);
        setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, status: "paused" } : a));
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6 text-text-primary neon-text">Agent Registry</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const confidence = getConfidence(agent);
          const roleColor = ROLE_COLORS[agent.role] || "#8b5cf6";
          return (
            <Card
              key={agent.id}
              className="cursor-pointer hover:border-primary/50 transition-all duration-200 hover-glow"
              onClick={() => setSelected(agent)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: `linear-gradient(135deg, ${roleColor}66, ${roleColor})`, boxShadow: `0 0 12px ${roleColor}44` }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <div className="text-xs text-text-secondary mt-0.5">{agent.role}</div>
                  </div>
                  <Badge variant={confidence.variant} className="shrink-0">{confidence.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <span className={`w-2 h-2 rounded-full ${agent.status === "running" ? "bg-success ai-pulse" : agent.status === "paused" ? "bg-error" : "bg-text-muted"}`} />
                  <span>{agent.status.toUpperCase()}</span>
                  {(agent as Agent & { locked?: boolean; lockInfo?: { lockedBy: string; task: string } }).locked && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(251,113,133,0.15)", color: "var(--accent-rose)", fontSize: 10 }}>
                      🔒 {(agent as any).lockInfo?.task}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>Budget</span>
                    <span>${(agent.spentMonthlyCents / 100).toFixed(2)} / ${(agent.budgetMonthlyCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border-subtle)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: Math.min(100, (agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100) + "%",
                        backgroundColor: confidence.variant === "error" ? "var(--accent-rose)" : confidence.variant === "warning" ? "var(--accent-amber)" : "var(--accent-emerald)",
                      }}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={agent.status === "paused" ? "default" : "outline"}
                  className="gap-2 w-full"
                  onClick={(e) => { e.stopPropagation(); handlePauseResume(agent.id, agent.status); }}
                  disabled={loadingId === agent.id}
                >
                  {agent.status === "paused" ? <><Play size={12} />Resume</> : <><Pause size={12} />Pause</>}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {agents.length > 0 && (
        <div className="mt-6">
          <WorkflowCanvas agents={agents} />
        </div>
      )}
      <AgentDetailModal agent={selected} onClose={() => setSelected(null)} />
    </>
  );
}