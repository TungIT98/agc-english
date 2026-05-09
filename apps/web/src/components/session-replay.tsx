"use client";

import { useState, useEffect } from "react";
import { fetchAgentSessions, fetchReplaySteps } from "@/lib/api";
import type { SessionReplay } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader, Clock, ChevronRight, RotateCcw, MessageSquare } from "lucide-react";

interface SessionReplayProps {
  agentId: string;
  compact?: boolean;
}

const STEP_COLORS: Record<string, string> = {
  analyze: "#8b5cf6",
  reason: "#22d3ee",
  call_ai: "#fbbf24",
  process: "#34d399",
  complete: "#71717a",
};

const STEP_ICONS: Record<string, string> = {
  analyze: "🔍",
  reason: "⚙️",
  call_ai: "🤖",
  process: "📝",
  complete: "✅",
};

export function SessionReplay({ agentId, compact = false }: SessionReplayProps) {
  const [sessions, setSessions] = useState<SessionReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<SessionReplay["steps"]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);

  useEffect(() => {
    fetchAgentSessions(agentId)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [agentId]);

  async function handleExpand(queryId: string) {
    if (expandedSession === queryId) {
      setExpandedSession(null);
      setExpandedSteps([]);
      return;
    }
    setExpandedSession(queryId);
    setStepsLoading(true);
    try {
      const steps = await fetchReplaySteps(queryId);
      setExpandedSteps(steps);
    } catch {
      setExpandedSteps([]);
    } finally {
      setStepsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader size={12} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        <span className="text-xs text-text-muted">Loading history…</span>
      </div>
    );
  }

  if (sessions.length === 0) {
    if (compact) {
      return <span className="text-xs text-text-muted">No sessions yet</span>;
    }
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-text-muted">
        <Clock size={20} />
        <span className="text-sm">No session history yet</span>
        <span className="text-xs">Sessions appear here after agent queries</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Clock size={11} style={{ color: "var(--text-muted)" }} />
        <span className="text-xs text-text-muted">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <RotateCcw size={13} style={{ color: "var(--accent-violet)" }} />
        <span className="text-sm font-medium text-text-primary">Session History</span>
        <Badge variant="outline" className="text-xs">{sessions.length}</Badge>
      </div>

      <div className="space-y-2">
        {sessions.map((session, i) => {
          const isExpanded = expandedSession === session.query.id;
          return (
            <div key={session.query.id} className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
              {/* Session header */}
              <button
                onClick={() => handleExpand(session.query.id)}
                className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                style={{ backgroundColor: "var(--bg-elevated)" }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, #8b5cf644, #8b5cf6)` }}
                >
                  <Clock size={11} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-primary truncate">
                    {session.query.description || "Agent query"}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted">
                      {new Date(session.query.createdAt).toLocaleString()}
                    </span>
                    {session.query.metadata?.costCents && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {session.query.metadata.costCents}c
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {session.steps.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {session.steps.length} steps
                    </Badge>
                  )}
                  <ChevronRight
                    size={12}
                    style={{
                      color: "var(--text-muted)",
                      transform: isExpanded ? "rotate(90deg)" : "none",
                      transition: "transform 200ms",
                    }}
                  />
                </div>
              </button>

              {/* Expanded steps */}
              {isExpanded && (
                <div className="border-t p-3 space-y-2" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-base)" }}>
                  {stepsLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader size={12} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                      <span className="text-xs text-text-muted">Loading steps…</span>
                    </div>
                  ) : expandedSteps.length > 0 ? (
                    <div className="space-y-1.5">
                      {expandedSteps.map((step, j) => {
                        const color = STEP_COLORS[step.metadata?.step || ""] || "#71717a";
                        const icon = STEP_ICONS[step.metadata?.step || ""] || "→";
                        return (
                          <div key={step.id} className="flex items-center gap-2.5">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                              style={{ backgroundColor: `${color}22`, border: `1px solid ${color}44` }}
                            >
                              {icon}
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-text-primary">{step.description}</div>
                            </div>
                            <div className="text-xs text-text-muted shrink-0">
                              +{((step.metadata?.order as number) || j) * 0.5}s
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted py-2">No step details available</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}