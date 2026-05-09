"use client";

import { useState } from "react";;
import { fetchAgents, generateWorkflowFromNL, fetchWorkflowTemplates, GeneratedWorkflow, WorkflowTemplate } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader, Sparkles, Zap, ArrowRight, CheckCircle, MessageSquare } from "lucide-react";

const AGENT_ICONS: Record<string, string> = {
  Orchestrator: "🤖",
  "Customer Support": "💬",
  Sales: "🎯",
  Content: "✍️",
  Training: "📚",
  Branding: "🎨",
};

export default function WorkflowBuilderPage() {
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [workflow, setWorkflow] = useState<GeneratedWorkflow | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [stepStatus, setStepStatus] = useState<Record<number, "pending" | "done">>({});

  async function handleGenerate() {
    if (!description.trim()) return;
    setGenerating(true);
    setWorkflow(null);
    setStepStatus({});
    try {
      const agents = await fetchAgents();
      const wf = await generateWorkflowFromNL(description, agents.map((a) => ({ id: a.id, name: a.name, role: a.role })));
      setWorkflow(wf);
    } catch {
      // handle error
    } finally {
      setGenerating(false);
    }
  }

  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const tpls = await fetchWorkflowTemplates();
      setTemplates(tpls);
    } finally {
      setLoadingTemplates(false);
    }
  }

  function applyTemplate(tpl: WorkflowTemplate) {
    setSelectedTemplate(tpl);
    setWorkflow({
      name: tpl.name,
      description: tpl.description,
      steps: tpl.steps,
      generatedAt: new Date().toISOString(),
    });
    setStepStatus({});
  }

  function simulateRun() {
    const steps = workflow?.steps || selectedTemplate?.steps || [];
    let delay = 0;
    for (const step of steps) {
      setTimeout(() => {
        setStepStatus((prev) => ({ ...prev, [step.order]: "done" }));
      }, delay);
      delay += 800;
    }
  }

  return (
    <div className="gradient-orb-bg"><div className="flex items-center gap-3 mb-6">
          <Sparkles size={20} style={{ color: "var(--accent-violet)" }} />
          <h1 className="text-2xl font-bold text-text-primary neon-text">Workflow Builder</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: NL input */}
          <div className="flex flex-col gap-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare size={14} style={{ color: "var(--accent-cyan)" }} />
                  Describe your workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='e.g., "Khi có khách hàng phàn nàn về hoàn tiền, CSKH xử lý và chuyển CEO duyệt nếu trên $50. Nếu khách muốn nâng cấp gói, chuyển qua Sales."'
                  className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                  rows={5}
                  style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={!description.trim() || generating}
                  loading={generating}
                  className="gap-2"
                  style={{ backgroundColor: "var(--accent-violet)" }}
                >
                  <Sparkles size={14} />
                  Generate Workflow
                </Button>
                <div className="text-xs text-text-muted leading-relaxed">
                  💡 Try: "khách phàn nàn hoàn tiền", "tạo nội dung marketing", "onboard sinh viên mới", "pipeline bán hàng"
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap size={14} style={{ color: "var(--accent-amber)" }} />
                    Templates
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={loadTemplates} className="gap-1 text-xs" loading={loadingTemplates}>
                    Load
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {templates.length === 0 ? (
                  <div className="text-sm text-text-muted py-4 text-center">
                    Click Load to see pre-built templates
                  </div>
                ) : (
                  templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      className="flex items-start gap-3 p-3 rounded-lg border text-left transition-all hover:bg-[var(--bg-hover)]"
                      style={{
                        borderColor: selectedTemplate?.id === tpl.id ? "var(--accent-violet)" : "var(--border-subtle)",
                        backgroundColor: selectedTemplate?.id === tpl.id ? "rgba(139,92,246,0.1)" : "var(--bg-elevated)",
                      }}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{tpl.name}</div>
                        <div className="text-xs text-text-muted mt-0.5">{tpl.description}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {tpl.steps.map((s) => (
                            <Badge key={s.order} variant="outline" className="text-xs px-1 py-0">{s.agent}</Badge>
                          ))}
                        </div>
                      </div>
                      <ArrowRight size={12} style={{ color: "var(--text-muted)", marginTop: 4 }} />
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Generated workflow */}
          <div className="flex flex-col gap-4">
            {workflow ? (
              <Card className="glass-card" style={{ borderColor: "var(--border-accent)" }}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>{workflow.name}</CardTitle>
                    <Badge variant="success" className="text-xs">Generated</Badge>
                  </div>
                  <div className="text-xs text-text-muted mt-1">{workflow.description}</div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {workflow.steps.map((step) => {
                    const icon = AGENT_ICONS[step.agent.charAt(0).toUpperCase() + step.agent.slice(1)] || "🤖";
                    const isDone = stepStatus[step.order] === "done";
                    return (
                      <div key={step.order} className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                          style={{
                            backgroundColor: isDone ? "rgba(52,211,153,0.15)" : "var(--bg-elevated)",
                            border: `2px solid ${isDone ? "var(--accent-emerald)" : "var(--border-subtle)"}`,
                          }}
                        >
                          {isDone ? <CheckCircle size={14} style={{ color: "var(--accent-emerald)" }} /> : icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">Step {step.order}: {step.action}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">Agent: {step.agent}</Badge>
                            <span className="text-xs text-text-muted">Trigger: {step.trigger}</span>
                          </div>
                        </div>
                        <div className="text-xs text-text-muted">{step.order * 0.5}s</div>
                      </div>
                    );
                  })}

                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={simulateRun}
                      className="gap-1"
                      style={{ color: "var(--accent-emerald)" }}
                    >
                      ▶ Simulate Run
                    </Button>
                    <Button
                      size="sm"
                      style={{ backgroundColor: "var(--accent-violet)" }}
                      className="gap-1"
                    >
                      Save Workflow
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card flex-1">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Zap size={32} style={{ color: "var(--text-muted)" }} />
                  <div className="text-sm text-text-muted mt-3">
                    Describe your workflow or load a template to see it here
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}