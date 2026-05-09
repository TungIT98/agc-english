"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, Send, CheckCircle, ArrowRight, Shield } from "lucide-react";

interface IntentStep {
  id: string;
  icon: string;
  action: string;
  detail: string;
  risk: "safe" | "caution" | "action";
}

interface IntentPreviewModalProps {
  open: boolean;
  agentName: string;
  prompt: string;
  intents: IntentStep[];
  onConfirm: () => void;
  onCancel: () => void;
  onHandleMyself?: () => void;
  loading?: boolean;
}

export type { IntentStep, IntentPreviewModalProps };

const RISK_COLORS = {
  safe: { color: "var(--accent-emerald)", bg: "rgba(52,211,153,0.1)", label: "Safe" },
  caution: { color: "var(--accent-amber)", bg: "rgba(251,191,36,0.1)", label: "Review" },
  action: { color: "var(--accent-rose)", bg: "rgba(251,113,133,0.1)", label: "Requires Confirm" },
};

const STEP_ICONS: Record<string, string> = {
  analyze: "🔍",
  send_zalo: "💬",
  create_approval: "📋",
  spend_budget: "💰",
  search_student: "👤",
  create_task: "✅",
  delegate: "🔀",
  update: "✏️",
  review: "👀",
  respond: "💬",
};

export function IntentPreviewModal({
  open,
  agentName,
  prompt,
  intents,
  onConfirm,
  onCancel,
  onHandleMyself,
  loading,
}: IntentPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="glass-card max-w-lg" style={{ borderColor: "var(--border-accent)" }}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #8b5cf666, #8b5cf6)", boxShadow: "0 0 16px #8b5cf644" }}
            >
              {agentName.charAt(0)}
            </div>
            <DialogTitle className="text-base neon-text">Intent Preview — {agentName}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Prompt context */}
        <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <div className="text-xs text-text-muted mb-1 flex items-center gap-1">
            <Zap size={10} style={{ color: "var(--accent-violet)" }} />
            Your request
          </div>
          <div className="text-text-primary leading-relaxed">{prompt}</div>
        </div>

        {/* Intent steps */}
        {intents.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs text-text-muted flex items-center gap-1">
              <ArrowRight size={10} style={{ color: "var(--accent-cyan)" }} />
              Agent will execute the following steps:
            </div>
            {intents.map((step, i) => {
              const risk = RISK_COLORS[step.risk];
              return (
                <div
                  key={step.id}
                  className="flex items-start gap-3 rounded-lg p-3 transition-all duration-200"
                  style={{ backgroundColor: risk.bg, border: `1px solid ${risk.color}33` }}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5" style={{ backgroundColor: `${risk.color}22` }}>
                    <span className="text-sm">{STEP_ICONS[step.icon] || "→"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-text-primary">{step.action}</span>
                      <Badge
                        variant={step.risk === "safe" ? "success" : step.risk === "caution" ? "warning" : "error"}
                        className="text-xs px-1.5 py-0.5"
                      >
                        {risk.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-text-secondary leading-relaxed">{step.detail}</div>
                  </div>
                  {step.risk === "action" && (
                    <Shield size={14} style={{ color: risk.color }} className="shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-text-secondary">
            <CheckCircle size={24} style={{ color: "var(--accent-emerald)" }} />
            <div className="text-sm">Agent will respond directly without additional actions</div>
          </div>
        )}

        {/* Budget warning */}
        {intents.some((s) => s.action.includes("budget") || s.action.includes("spend")) && (
          <div
            className="flex items-center gap-2 rounded-lg p-3 text-xs"
            style={{ backgroundColor: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.3)" }}
          >
            <AlertTriangle size={12} style={{ color: "var(--accent-rose)" }} />
            <span style={{ color: "var(--accent-rose)" }}>
              This action involves spending from the agent&apos;s monthly budget.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={onHandleMyself}
            disabled={loading}
          >
            <Send size={13} />
            I&apos;ll handle it
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-1"
            style={{ backgroundColor: "var(--accent-violet)" }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="ai-pulse">Processing...</span>
            ) : (
              <>
                <CheckCircle size={13} />
                Proceed
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
