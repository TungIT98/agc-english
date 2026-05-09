"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://agc-english-api.thanhtungtran364.workers.dev";

interface SettingsData {
  company: { id: string; name: string; budgetMonthlyCents: number };
  agents: { id: string; name: string; role: string; budgetMonthlyCents: number }[];
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [agentBudgets, setAgentBudgets] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setCompanyName(d.company?.name || "");
        const budgets: Record<string, number> = {};
        d.agents?.forEach((a: { id: string; budgetMonthlyCents: number }) => {
          budgets[a.id] = a.budgetMonthlyCents;
        });
        setAgentBudgets(budgets);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, agentBudgets }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6 text-text-primary">Settings</h1>
      <div className="flex flex-col gap-6 max-w-2xl">
          <Card>
            <CardHeader><CardTitle>Company</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Company Name</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Monthly Budget</label>
                <div className="text-lg font-bold" style={{ color: "var(--primary)" }}>
                  ${((data.company?.budgetMonthlyCents ?? 0) / 100).toFixed(2)}/month
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Agent Budgets</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {data.agents?.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-3">
                    <div className="w-40">
                      <div className="text-sm font-medium text-text-primary">{agent.name}</div>
                      <Badge variant="outline" className="mt-1">{agent.role}</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-text-secondary text-sm">$</span>
                      <Input
                        type="number"
                        value={agentBudgets[agent.id] ?? agent.budgetMonthlyCents}
                        onChange={(e) =>
                          setAgentBudgets((prev) => ({ ...prev, [agent.id]: Number(e.target.value) }))
                        }
                        className="w-32"
                      />
                      <span className="text-text-secondary text-sm">dollars/month</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {saved && <span style={{ color: "var(--success)", alignSelf: "center" }}>✓ Saved</span>}
          </div>
        </div>
      </div>
  );
}