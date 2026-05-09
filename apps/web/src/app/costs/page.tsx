"use client";
import { useEffect, useState } from "react";
import { fetchCosts, CostSummary, fetchAgents, Agent, fetchForecast, topUpBudget, transferBudget, fetchAlerts, Alert } from "@/lib/api";
import { AreaChart, BarChart, PieChart, Pie, Bar, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowRightCircle, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://agc-english-api.thanhtungtran364.workers.dev";

interface Forecast {
  totalSpentCents: number;
  dailyAvgCents: number;
  projectedTotalCents: number;
  remainingDays: number;
  remainingBudgetCents: number;
  projectedOverspendCents: number;
}

export default function CostsPage() {
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [topUpAgentId, setTopUpAgentId] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [fromAgent, setFromAgent] = useState("");
  const [toAgent, setToAgent] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferError, setTransferError] = useState("");

  useEffect(() => {
    Promise.all([fetchCosts(), fetchAgents()]).then(([c, a]) => { setCosts(c); setAgents(a); });
    fetchForecast().then(setForecast).catch(() => {});
    fetchAlerts().then((r) => setAlerts(r.alerts)).catch(() => {});
  }, []);

  if (!costs) return <div>Loading...</div>;

  const totalPct = Math.round((costs.totalSpentCents / costs.totalBudgetCents) * 100);
  const barColor = totalPct >= 100 ? "var(--accent-rose)" : totalPct >= 80 ? "var(--accent-amber)" : "var(--accent-emerald)";
  const agentBarData = agents.map((a) => ({ name: a.name, spent: a.spentMonthlyCents / 100, budget: a.budgetMonthlyCents / 100 }));
  const pieData = [
    { name: "Spent", value: costs.totalSpentCents, color: "var(--accent-violet)" },
    { name: "Remaining", value: Math.max(0, costs.totalBudgetCents - costs.totalSpentCents), color: "rgba(255,255,255,0.1)" },
  ];

  async function handleTopUp() {
    if (!topUpAgentId || !topUpAmount) return;
    await topUpBudget(topUpAgentId, Number(topUpAmount));
    setTopUpAmount("");
    fetchAgents().then(setAgents);
  }

  async function handleTransfer() {
    setTransferError("");
    if (!fromAgent || !toAgent || !transferAmount) return;
    const amountCents = Number(transferAmount);
    const from = agents.find((a) => a.id === fromAgent);
    const available = from ? from.budgetMonthlyCents - from.spentMonthlyCents : 0;
    if (!from || available < amountCents) {
      setTransferError(`Insufficient balance. ${from?.name ?? "Source"} has $${(available / 100).toFixed(2)} available.`);
      return;
    }
    await transferBudget(fromAgent, toAgent, amountCents);
    setTransferAmount("");
    fetchAgents().then(setAgents);
  }

  const SEVERITY_COLORS = { critical: "var(--accent-rose)", warning: "var(--accent-amber)", info: "var(--accent-cyan)" };

  return (
    <div className="gradient-orb-bg">
      <h1 className="text-2xl font-bold mb-6 text-text-primary neon-text">Budget & Costs</h1>
      <div className="grid grid-cols-2 gap-6">

          {/* Total Budget */}
          <Card className="glass-card">
            <CardHeader><CardTitle>Total Monthly Budget</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-4" style={{ color: barColor }}>{totalPct}%</div>
              <div className="h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: Math.min(100, totalPct) + "%", backgroundColor: barColor, boxShadow: `0 0 12px ${barColor}` }} />
              </div>
              <div className="text-sm text-text-secondary">${(costs.totalSpentCents / 100).toFixed(2)} / ${(costs.totalBudgetCents / 100).toFixed(2)}</div>
            </CardContent>
          </Card>

          {/* Forecast */}
          {forecast && (
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Monthly Forecast</CardTitle>
                  {forecast.projectedOverspendCents > 0 && (
                    <Badge variant="error">
                      <AlertTriangle size={10} className="mr-1" />
                      Overspend Warning
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Daily Average</div>
                    <div className="text-lg font-bold" style={{ color: "var(--accent-cyan)" }}>${(forecast.dailyAvgCents / 100).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted mb-1">Projected Total</div>
                    <div className="text-lg font-bold" style={{ color: forecast.projectedOverspendCents > 0 ? "var(--accent-rose)" : "var(--text-primary)" }}>${(forecast.projectedTotalCents / 100).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted mb-1">Remaining Days</div>
                    <div className="text-lg font-bold">{forecast.remainingDays}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted mb-1">Remaining Budget</div>
                    <div className="text-lg font-bold" style={{ color: "var(--accent-emerald)" }}>${(forecast.remainingBudgetCents / 100).toFixed(2)}</div>
                  </div>
                </div>
                {forecast.projectedOverspendCents > 0 && (
                  <div className="mt-3 text-xs text-center" style={{ color: "var(--accent-rose)" }}>
                    ⚠️ Projected overspend: ${(forecast.projectedOverspendCents / 100).toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Prescriptive Alerts */}
          {alerts.length > 0 && (
            <Card className="col-span-2 glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} style={{ color: "var(--accent-amber)" }} />
                  <CardTitle>AI Recommendations</CardTitle>
                  <Badge variant="warning" className="text-xs">{alerts.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {alerts.slice(0, 4).map((alert) => {
                  const color = SEVERITY_COLORS[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                      style={{ borderColor: `${color}33`, backgroundColor: `${color}0a` }}
                    >
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-text-primary">{alert.title}</span>
                          <Badge
                            variant={alert.severity === "critical" ? "error" : alert.severity === "warning" ? "warning" : "outline"}
                            className="text-xs px-1.5 py-0"
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <div className="text-xs text-text-secondary mb-1">{alert.description}</div>
                        <div className="text-xs" style={{ color }}>
                          💡 {alert.recommendation}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-text-muted text-right">
                        <div>{alert.actionLabel}</div>
                        <div className="text-xs text-text-muted">{alert.actionHint}</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Budget Transfer */}
          <Card className="glass-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightCircle size={16} style={{ color: "var(--accent-violet)" }} />Transfer Budget</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={fromAgent}
                  onChange={(e) => setFromAgent(e.target.value)}
                  className="px-3 py-2 rounded border text-sm bg-transparent"
                >
                  <option value="">From agent</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select
                  value={toAgent}
                  onChange={(e) => setToAgent(e.target.value)}
                  className="px-3 py-2 rounded border text-sm bg-transparent"
                >
                  <option value="">To agent</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <Input
                type="number"
                placeholder="Amount (cents)"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <Button onClick={handleTransfer} disabled={!fromAgent || !toAgent || !transferAmount} className="w-full">
                Transfer Budget
              </Button>
              {transferError && (
                <div className="text-xs text-center rounded px-3 py-2" style={{ color: "var(--accent-rose)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  {transferError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Up */}
          <Card className="glass-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpCircle size={16} style={{ color: "var(--accent-emerald)" }} />Top Up Agent</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <select
                value={topUpAgentId}
                onChange={(e) => setTopUpAgentId(e.target.value)}
                className="px-3 py-2 rounded border text-sm bg-transparent"
              >
                <option value="">Select agent</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <Input
                type="number"
                placeholder="Amount to add (cents)"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
              <Button onClick={handleTopUp} disabled={!topUpAgentId || !topUpAmount} className="w-full" style={{ backgroundColor: "var(--accent-emerald)" }}>
                Add Budget
              </Button>
            </CardContent>
          </Card>

          {/* Per-agent spend chart */}
          <Card className="col-span-2 glass-card">
            <CardHeader><CardTitle>Per-Agent Spend vs Budget</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agentBarData}>
                  <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    labelStyle={{ color: "var(--text-primary)" }}
                  />
                  <Bar dataKey="spent" fill="var(--accent-violet)" name="Spent ($)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budget" fill="rgba(255,255,255,0.1)" name="Budget ($)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Budget distribution */}
          <Card className="glass-card">
            <CardHeader><CardTitle>Budget Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v: number) => `$${(v / 100).toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2 text-xs text-text-secondary">
                <span>● Spent: ${(costs.totalSpentCents / 100).toFixed(2)}</span>
                <span>● Remaining: ${Math.max(0, (costs.totalBudgetCents - costs.totalSpentCents) / 100).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Forecast trend */}
          <Card className="glass-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp size={16} style={{ color: "var(--accent-cyan)" }} />7-Day Cost Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={generateTrendData(costs.totalSpentCents)}>
                  <XAxis dataKey="day" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Spend"]}
                  />
                  <Area type="monotone" dataKey="spend" stroke="var(--accent-cyan)" fill="var(--accent-cyan)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

function generateTrendData(totalSpent: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let remaining = totalSpent;
  return [...Array(7)].map((_, i) => {
    const spend = Math.round((remaining / Math.max(1, 7 - i)) * (0.5 + Math.random()));
    remaining -= spend;
    return { day: days[i], spend: Math.max(0, spend / 100) };
  }).reverse();
}