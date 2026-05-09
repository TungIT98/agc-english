"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAgents, Agent, previewAgentQuery, queryAgent } from "@/lib/api";
import { IntentPreviewModal } from "@/components/intent-preview-modal";
import type { IntentStep } from "@/components/intent-preview-modal";
import { AutonomySelector } from "@/components/autonomy-selector";
import { SessionReplay } from "@/components/session-replay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader, Sparkles, Settings2, Clock } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const ROLE_COLORS: Record<string, string> = {
  Orchestrator: "#8b5cf6",
  "Customer Support": "#34d399",
  Sales: "#fbbf24",
  Content: "#a78bfa",
  Training: "#22d3ee",
  Branding: "#fb7185",
};

export default function ChatPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [intentModalOpen, setIntentModalOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [intents, setIntents] = useState<IntentStep[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [autonomyOpen, setAutonomyOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents().then((a) => {
      setAgents(a);
      if (a.length > 0) setSelectedAgent(a[0]);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !selectedAgent || loading) return;

    const prompt = input.trim();
    const userMsg: Message = { role: "user", content: prompt, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      setPreviewLoading(true);
      const preview = await previewAgentQuery(selectedAgent.id, prompt);
      setPreviewLoading(false);

      if (preview.intents && preview.intents.length > 0) {
        setPendingPrompt(prompt);
        setIntents(preview.intents);
        setIntentModalOpen(true);
        setMessages((prev) => prev.slice(0, -1)); // remove pending user message until confirmed
      } else {
        // No intents — query directly
        setMessages((prev) => [...prev, { role: "assistant", content: "…", timestamp: new Date() }]);
        const result = await queryAgent(selectedAgent.id, prompt);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: result.result || "(no response)",
            timestamp: new Date(),
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "⚠️ Failed to reach the agent. Please try again.",
          timestamp: new Date(),
        };
        return updated;
      });
    } finally {
      setLoading(false);
      setPreviewLoading(false);
    }
  }

  async function handleIntentConfirm() {
    setIntentModalOpen(false);
    if (!selectedAgent || !pendingPrompt) return;

    setMessages((prev) => [...prev, { role: "assistant", content: "…", timestamp: new Date() }]);
    setLoading(true);

    try {
      const result = await queryAgent(selectedAgent.id, pendingPrompt);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: result.result || "(no response)",
          timestamp: new Date(),
        };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "⚠️ Agent execution failed. Please try again.",
          timestamp: new Date(),
        };
        return updated;
      });
    } finally {
      setLoading(false);
      setPendingPrompt("");
      setIntents([]);
    }
  }

  function handleIntentCancel() {
    setIntentModalOpen(false);
    setPendingPrompt("");
    setIntents([]);
  }

  function handleIntentMyself() {
    setIntentModalOpen(false);
    // Just show a note that user chose to handle it themselves
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "👍 Got it — let me know if you need help with anything else.",
        timestamp: new Date(),
      },
    ]);
    setPendingPrompt("");
    setIntents([]);
  }

  return (
    <div className="flex flex-col h-full">{/* Agent selector strip */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto shrink-0"
          style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}
        >
          <Sparkles size={14} style={{ color: "var(--accent-violet)" }} />
          <span className="text-xs text-text-muted shrink-0">Agent:</span>
          {agents.map((agent) => {
            const roleColor = ROLE_COLORS[agent.role] || "#8b5cf6";
            const isSelected = selectedAgent?.id === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => { setSelectedAgent(agent); setMessages([]); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 ${isSelected ? "neon-border" : ""}`}
                style={{
                  backgroundColor: isSelected ? `${roleColor}22` : "transparent",
                  border: `1px solid ${isSelected ? roleColor : "var(--border-subtle)"}`,
                  color: isSelected ? roleColor : "var(--text-secondary)",
                  boxShadow: isSelected ? `0 0 10px ${roleColor}33` : "none",
                }}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: roleColor }}
                >
                  {agent.name.charAt(0)}
                </div>
                {agent.name.split(" ")[0]}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {selectedAgent && <AutonomySelector agent={selectedAgent} compact />}
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
              title="Session history"
            >
              <Clock size={14} />
            </button>
            <button
              onClick={() => setAutonomyOpen(true)}
              className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
              title="Supervision settings"
            >
              <Settings2 size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {messages.length === 0 && selectedAgent && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-text-secondary">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{
                  background: `linear-gradient(135deg, ${ROLE_COLORS[selectedAgent.role] || "#8b5cf6"}44, ${ROLE_COLORS[selectedAgent.role] || "#8b5cf6"})`,
                  boxShadow: `0 0 24px ${ROLE_COLORS[selectedAgent.role] || "#8b5cf6"}44`,
                }}
              >
                {selectedAgent.name.charAt(0)}
              </div>
              <div className="text-center">
                <div className="text-base font-medium text-text-primary mb-1">{selectedAgent.name}</div>
                <div className="text-sm text-text-muted">{selectedAgent.description || selectedAgent.role}</div>
              </div>
              <div className="text-sm text-text-muted">Send a message to start the conversation.</div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 mt-1"
                style={{
                  background: msg.role === "user"
                    ? "var(--accent-cyan)"
                    : ROLE_COLORS[selectedAgent?.role || "Orchestrator"] || "var(--accent-violet)",
                }}
              >
                {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-text-secondary">
                    {msg.role === "user" ? "You" : selectedAgent?.name || "Agent"}
                  </span>
                  <span className="text-xs text-text-muted">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <Card className="glass-card">
                  <CardContent className="p-4 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {msg.content === "…" ? (
                      <span className="flex items-center gap-2 ai-pulse">
                        <Loader size={14} style={{ color: "var(--accent-violet)" }} />
                        Thinking…
                      </span>
                    ) : (
                      msg.content
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}

          {previewLoading && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 mt-1"
                style={{ background: ROLE_COLORS[selectedAgent?.role || "Orchestrator"] || "var(--accent-violet)" }}
              >
                <Bot size={14} />
              </div>
              <Card className="glass-card flex-1">
                <CardContent className="p-4">
                  <span className="flex items-center gap-2 ai-pulse">
                    <Loader size={14} style={{ color: "var(--accent-violet)" }} />
                    Analyzing intent…
                  </span>
                </CardContent>
              </Card>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="border-t p-4 shrink-0"
          style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}
        >
          <div className="flex gap-3 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={`Message ${selectedAgent?.name || "an agent"}…`}
              disabled={!selectedAgent || loading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || !selectedAgent || loading}
              style={{ backgroundColor: "var(--accent-violet)" }}
              className="gap-2"
            >
              <Send size={14} />
              Send
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2 max-w-3xl mx-auto">
            <Badge variant="success" className="text-xs">
              <Sparkles size={9} className="mr-1" />
              Intent Preview
            </Badge>
            <span className="text-xs text-text-muted">Agent shows plan before taking actions</span>
          </div>
        </div>

      <IntentPreviewModal
        open={intentModalOpen}
        agentName={selectedAgent?.name || "Agent"}
        prompt={pendingPrompt}
        intents={intents}
        onConfirm={handleIntentConfirm}
        onCancel={handleIntentCancel}
        onHandleMyself={handleIntentMyself}
        loading={loading}
      />

      <Sheet open={autonomyOpen} onOpenChange={setAutonomyOpen}>
        <SheetContent side="right" className="glass-card w-80 flex flex-col gap-6 p-6">
          <div className="flex items-center gap-2">
            <Settings2 size={16} style={{ color: "var(--accent-violet)" }} />
            <span className="text-sm font-medium text-text-primary">Supervision Settings</span>
          </div>
          {selectedAgent && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-elevated)" }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: ROLE_COLORS[selectedAgent.role] || "#8b5cf6" }}
                >
                  {selectedAgent.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">{selectedAgent.name}</div>
                  <div className="text-xs text-text-muted">{selectedAgent.role}</div>
                </div>
              </div>
              <AutonomySelector agent={selectedAgent} />
            </div>
          )}
          <div className="text-xs text-text-muted leading-relaxed">
            Adjust how much independence this agent has. Higher autonomy means fewer confirmations before acting.
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="glass-card w-96 flex flex-col gap-4 p-6 overflow-y-auto">
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: "var(--accent-cyan)" }} />
            <span className="text-sm font-medium text-text-primary">Session History</span>
          </div>
          {selectedAgent ? (
            <SessionReplay agentId={selectedAgent.id} />
          ) : (
            <div className="text-sm text-text-muted">Select an agent to view history</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
