"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Rocket, Users, BookOpen, MessageSquare, ArrowRight, ArrowLeft,
  CheckCircle, Bot, Zap, Star
} from "lucide-react";

interface OnboardingWizardProps {
  onComplete?: () => void;
}

const STEPS = [
  { id: "welcome", label: "Welcome", icon: "🎉" },
  { id: "template", label: "Choose Agent", icon: "🤖" },
  { id: "configure", label: "Configure", icon: "⚙️" },
  { id: "first-task", label: "First Task", icon: "✅" },
  { id: "done", label: "Complete", icon: "🎊" },
];

const AGENT_TEMPLATES = [
  { id: "cskh", name: "CSKH Agent", role: "Customer Support", icon: "💬", description: "Handle customer complaints and refund requests up to $50 automatically.", color: "#34d399", tasks: 24 },
  { id: "sales", name: "Sales Agent", role: "Sales", icon: "🎯", description: "Consult and close deals. Connect to CRM for lead management.", color: "#fbbf24", tasks: 18 },
  { id: "content", name: "Content Agent", role: "Content", icon: "✍️", description: "Create learning content, marketing copy, and social posts.", color: "#8b5cf6", tasks: 31 },
  { id: "training", name: "Training Agent", role: "Training", icon: "📚", description: "Personalize learning paths and generate assessments.", color: "#22d3ee", tasks: 12 },
  { id: "branding", name: "Branding Agent", role: "Branding", icon: "🎨", description: "Ensure brand consistency across all content and materials.", color: "#fb7185", tasks: 8 },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof AGENT_TEMPLATES[0] | null>(null);
  const [agentName, setAgentName] = useState("");
  const [firstTask, setFirstTask] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleNext() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleFinish() {
    setLoading(true);
    // Simulate creating the agent (API already has it seeded)
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    onComplete?.();
    router.push("/chat");
  }

  const currentStep = STEPS[step];
  const canProceed = step < STEPS.length - 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-base)" }}>
      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(139,92,246,0.15), transparent)",
        }}
      />

      <div className="w-full max-w-2xl relative">
        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div
                className="h-1 flex-1 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: i <= step ? "var(--accent-violet)" : "rgba(255,255,255,0.1)",
                  boxShadow: i <= step ? "0 0 8px var(--accent-violet)" : "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Badge variant="outline" className="text-xs">
            Step {step + 1} of {STEPS.length}
          </Badge>
          <span className="text-sm font-medium text-text-primary">
            {currentStep.icon} {currentStep.label}
          </span>
        </div>

        {/* Step content */}
        <Card className="glass-card" style={{ borderColor: "var(--border-accent)" }}>
          <CardContent className="p-8">

            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="flex flex-col items-center gap-6 text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                  style={{ background: "linear-gradient(135deg, #8b5cf644, #8b5cf6)", boxShadow: "0 0 40px #8b5cf644" }}
                >
                  🎉
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome to AGC_English!</h2>
                  <p className="text-text-secondary max-w-md">
                    Create your first AI agent in under 5 minutes. We&apos;ll guide you through choosing a template, configuring it, and running your first task.
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} style={{ color: "var(--accent-violet)" }} />
                    <span>6 agents ready</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap size={14} style={{ color: "var(--accent-amber)" }} />
                    <span>5 min setup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Rocket size={14} style={{ color: "var(--accent-emerald)" }} />
                    <span>Production-ready</span>
                  </div>
                </div>
                <Button
                  onClick={handleNext}
                  className="gap-2 px-8"
                  style={{ backgroundColor: "var(--accent-violet)" }}
                >
                  Get Started <ArrowRight size={14} />
                </Button>
              </div>
            )}

            {/* Step 1: Choose template */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-bold text-text-primary">Choose your first agent</h2>
                  <p className="text-sm text-text-muted mt-1">Each template comes pre-configured with tools and prompts</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {AGENT_TEMPLATES.map((t) => {
                    const isSelected = selectedTemplate?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className="flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-200"
                        style={{
                          backgroundColor: isSelected ? `${t.color}15` : "var(--bg-elevated)",
                          borderColor: isSelected ? t.color : "var(--border-subtle)",
                          boxShadow: isSelected ? `0 0 16px ${t.color}33` : "none",
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                          style={{ backgroundColor: `${t.color}22` }}
                        >
                          {t.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">{t.name}</span>
                            <Badge variant="outline" className="text-xs">{t.role}</Badge>
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">{t.description}</p>
                        </div>
                        <div className="shrink-0 text-xs text-text-muted">{t.tasks} tasks/day</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleNext}
                    disabled={!selectedTemplate}
                    className="gap-2"
                    style={{ backgroundColor: "var(--accent-violet)" }}
                  >
                    Continue <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Configure */}
            {step === 2 && selectedTemplate && (
              <div className="flex flex-col gap-5">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-bold text-text-primary">Configure your agent</h2>
                  <p className="text-sm text-text-muted mt-1">Give your agent a name and set its initial budget</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Agent Name</label>
                    <Input
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder={selectedTemplate.name}
                      className="w-full"
                    />
                    {agentName && (
                      <div className="mt-2 flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-elevated)" }}>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: selectedTemplate.color }}
                        >
                          {agentName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-text-primary">{agentName}</div>
                          <div className="text-xs text-text-muted">{selectedTemplate.role}</div>
                        </div>
                        <Badge variant="success" className="ml-auto text-xs">Ready</Badge>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Monthly Budget (cents)</label>
                    <Input
                      type="number"
                      value="2500"
                      readOnly
                      className="w-full"
                    />
                    <p className="text-xs text-text-muted mt-1">Default budget of 2500c/mo ($25) — can be changed later in Settings</p>
                  </div>
                </div>
                <div className="flex justify-between mt-2">
                  <Button variant="outline" onClick={handleBack} className="gap-1">
                    <ArrowLeft size={13} /> Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!agentName.trim()}
                    className="gap-2"
                    style={{ backgroundColor: "var(--accent-violet)" }}
                  >
                    Continue <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: First task */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-bold text-text-primary">Run your first task</h2>
                  <p className="text-sm text-text-muted mt-1">
                    Try your new agent — it will preview its plan before acting
                  </p>
                </div>
                <div
                  className="flex items-start gap-3 p-4 rounded-lg border"
                  style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ background: selectedTemplate?.color || "#8b5cf6" }}
                  >
                    {selectedTemplate?.icon || "🤖"}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary mb-0.5">{agentName || selectedTemplate?.name}</div>
                    <div className="text-xs text-text-muted mb-2">{selectedTemplate?.description}</div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--accent-cyan)" }}>
                      <Sparkles size={10} />
                      Intent Preview enabled
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">What should {agentName || selectedTemplate?.name} do first?</label>
                  <textarea
                    value={firstTask}
                    onChange={(e) => setFirstTask(e.target.value)}
                    placeholder={`e.g., "Hello, introduce yourself to new students and offer course recommendations" `}
                    className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                    rows={4}
                    style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <Button variant="outline" onClick={handleBack} className="gap-1">
                    <ArrowLeft size={13} /> Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!firstTask.trim()}
                    className="gap-2"
                    style={{ backgroundColor: "var(--accent-violet)" }}
                  >
                    Continue <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Done */}
            {step === 4 && (
              <div className="flex flex-col items-center gap-6 text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                  style={{
                    background: "linear-gradient(135deg, #34d39944, #34d399)",
                    boxShadow: "0 0 40px #34d39944",
                  }}
                >
                  🎊
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">
                    {agentName || selectedTemplate?.name} is ready!
                  </h2>
                  <p className="text-text-secondary max-w-md">
                    Your agent has been configured and is ready to help. When you send it a task, it will show you its plan before acting.
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(52,211,153,0.1)" }}>
                      <CheckCircle size={14} style={{ color: "var(--accent-emerald)" }} />
                    </div>
                    <span className="text-xs text-text-muted">Intent Preview</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(52,211,153,0.1)" }}>
                      <CheckCircle size={14} style={{ color: "var(--accent-emerald)" }} />
                    </div>
                    <span className="text-xs text-text-muted">Autonomy Dial</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(52,211,153,0.1)" }}>
                      <CheckCircle size={14} style={{ color: "var(--accent-emerald)" }} />
                    </div>
                    <span className="text-xs text-text-muted">Budget tracked</span>
                  </div>
                </div>
                <Button
                  onClick={handleFinish}
                  loading={loading}
                  className="gap-2 px-8"
                  style={{ backgroundColor: "var(--accent-emerald)" }}
                >
                  <Rocket size={14} />
                  Go to Chat
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skip link */}
        <div className="text-center mt-4">
          <button
            onClick={onComplete}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip onboarding — go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}