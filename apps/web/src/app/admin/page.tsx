"use client";

import { useState, useEffect } from "react";;
import {
  fetchGovernanceStats,
  fetchGovernanceAgents,
  fetchGovernanceAudit,
  updateGovernanceAgent,
  GovernanceStats,
  GovernanceAgent,
  GovernanceAuditEntry,
} from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield, Users, Activity, AlertTriangle, CheckCircle, Ban,
  PauseCircle, PlayCircle, FileText, Clock
} from "lucide-react";

export default function AdminPage() {
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [agents, setAgents] = useState<GovernanceAgent[]>([]);
  const [audit, setAudit] = useState<GovernanceAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetchGovernanceStats(),
      fetchGovernanceAgents(),
      fetchGovernanceAudit(),
    ])
      .then(([s, a, au]) => { setStats(s); setAgents(a); setAudit(au); })
      .catch(() => {/* graceful failure */})
      .finally(() => setLoading(false));
  }, []);

  async function handleAgentAction(agentId: string, action: string) {
    setActionLoading(agentId);
    try {
      await updateGovernanceAgent(agentId, action);
      const [statsResult, agentsResult] = await Promise.all([fetchGovernanceStats(), fetchGovernanceAgents()]);
      setStats(statsResult);
      setAgents(agentsResult);
      const au = await fetchGovernanceAudit();
      setAudit(au);
    } finally {
      setActionLoading(null);
    }
  }

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_COLORS: Record<string, string> = {
    idle: "var(--text-muted)",
    running: "var(--accent-emerald)",
    paused: "var(--accent-amber)",
    blocked: "var(--accent-rose)",
  };

  return (
    <div className="gradient-orb-bg"><div className="flex items-center gap-3 mb-6">
          <Shield size={20} style={{ color: "var(--accent-violet)" }} />
          <h1 className="text-2xl font-bold text-text-primary neon-text">Enterprise Governance</h1>
        </div>

        {loading ? (
          <div className="text-text-muted">Loading governance data…</div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Stats row */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Agents", value: stats.totalAgents, icon: "🤖", color: "var(--accent-violet)" },
                  { label: "Active", value: stats.activeAgents, icon: "✅", color: "var(--accent-emerald)" },
                  { label: "Blocked", value: stats.blockedAgents, icon: "🚫", color: "var(--accent-rose)" },
                  { label: "Governance Events", value: stats.governanceEvents, icon: "📋", color: "var(--accent-cyan)" },
                ].map(({ label, value, icon, color }) => (
                  <Card key={label} className="glass-card">
                    <CardContent className="p-4 flex flex-col gap-1">
                      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                      <div className="text-xs text-text-muted">{label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Agent Registry */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users size={15} style={{ color: "var(--accent-violet)" }} />
                    Agent Registry
                    <Badge variant="outline" className="text-xs">{agents.length}</Badge>
                  </CardTitle>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search agents…"
                    className="w-48 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                        {["Agent", "Role", "Status", "Budget", "Events", "Last Activity", "Actions"].map((h) => (
                          <th key={h} className="text-left text-xs text-text-muted pb-2 pr-4 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgents.map((agent) => {
                        const budgetPct = Math.round((agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100);
                        return (
                          <tr
                            key={agent.id}
                            className="border-b"
                            style={{ borderColor: "var(--border-subtle)" }}
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                  style={{ backgroundColor: STATUS_COLORS[agent.status] }}
                                >
                                  {agent.name.charAt(0)}
                                </div>
                                <span className="font-medium text-text-primary">{agent.name}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-text-secondary">{agent.role}</td>
                            <td className="py-3 pr-4">
                              <Badge
                                variant={agent.status === "blocked" ? "error" : agent.status === "paused" ? "warning" : "success"}
                                className="text-xs"
                              >
                                {agent.status}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="text-xs">
                                <span className={budgetPct > 80 ? "text-accent-rose" : "text-text-primary"}>
                                  {agent.spentMonthlyCents / 100}
                                </span>
                                <span className="text-text-muted"> of ${(agent.budgetMonthlyCents / 100).toFixed(2)}/month</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-text-secondary">{agent.totalEvents}</td>
                            <td className="py-3 pr-4 text-text-muted text-xs">
                              {agent.lastQueryAt ? new Date(agent.lastQueryAt).toLocaleDateString() : "Never"}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1">
                                {agent.status === "blocked" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAgentAction(agent.id, "enable")}
                                    disabled={actionLoading === agent.id}
                                    className="gap-1 text-xs"
                                  >
                                    <PlayCircle size={11} /> Enable
                                  </Button>
                                ) : agent.status === "paused" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAgentAction(agent.id, "enable")}
                                    disabled={actionLoading === agent.id}
                                    className="gap-1 text-xs"
                                  >
                                    <PlayCircle size={11} /> Resume
                                  </Button>
                                ) : agent.status === "idle" || agent.status === "running" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAgentAction(agent.id, "pause")}
                                      disabled={actionLoading === agent.id}
                                      className="gap-1 text-xs"
                                    >
                                      <PauseCircle size={11} /> Pause
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAgentAction(agent.id, "disable")}
                                      disabled={actionLoading === agent.id}
                                      className="gap-1 text-xs"
                                      style={{ color: "var(--accent-rose)" }}
                                    >
                                      <Ban size={11} /> Block
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Audit Log */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity size={15} style={{ color: "var(--accent-cyan)" }} />
                  Governance Audit Log
                  <Badge variant="outline" className="text-xs">{audit.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {audit.length === 0 ? (
                  <div className="text-center py-8 text-text-muted text-sm">
                    No governance events yet
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {audit.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                        style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
                      >
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{
                            backgroundColor:
                              entry.eventType === "governance" ? "var(--accent-rose)" :
                              entry.eventType === "agent_creation" ? "var(--accent-emerald)" :
                              "var(--accent-cyan)",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary">{entry.description}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">{entry.eventType}</Badge>
                            <span className="text-xs text-text-muted">{entry.agentName}</span>
                            <span className="text-xs text-text-muted">
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  );
}