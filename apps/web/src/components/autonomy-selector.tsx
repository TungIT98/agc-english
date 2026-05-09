"use client";

import { useState, useEffect } from "react";
import { fetchAgentAutonomy, setAgentAutonomy, Agent } from "@/lib/api";
import { Loader } from "lucide-react";

type AutonomyLevel = "observe" | "propose" | "confirm" | "autonomous";

const LEVELS: { level: AutonomyLevel; label: string; description: string; color: string }[] = [
  {
    level: "observe",
    label: "Observe & Suggest",
    description: "Agent analyzes and recommends — you decide and act",
    color: "#71717a",
  },
  {
    level: "propose",
    label: "Plan & Propose",
    description: "Agent creates a plan and waits for your approval",
    color: "#22d3ee",
  },
  {
    level: "confirm",
    label: "Act with Confirmation",
    description: "Agent acts but asks before sensitive operations",
    color: "#fbbf24",
  },
  {
    level: "autonomous",
    label: "Act Autonomously",
    description: "Agent acts independently within its role",
    color: "#34d399",
  },
];

interface AutonomySelectorProps {
  agent: Agent;
  compact?: boolean;
}

export function AutonomySelector({ agent, compact = false }: AutonomySelectorProps) {
  const [currentLevel, setCurrentLevel] = useState<string>("confirm");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAgentAutonomy(agent.id)
      .then((a) => setCurrentLevel(a.level))
      .catch(() => setCurrentLevel("confirm"))
      .finally(() => setLoading(false));
  }, [agent.id]);

  async function handleSelect(level: string) {
    if (level === currentLevel) return;
    setSaving(true);
    try {
      await setAgentAutonomy(agent.id, level);
      setCurrentLevel(level);
    } catch {
      // revert on error
    } finally {
      setSaving(false);
    }
  }

  const activeLevel = LEVELS.find((l) => l.level === currentLevel) || LEVELS[2];

  if (loading) {
    return (
      <div className="flex items-center gap-1.5">
        <Loader size={12} style={{ color: "var(--text-muted)" }} className="animate-spin" />
        <span className="text-xs text-text-muted">Autonomy…</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: activeLevel.color, boxShadow: `0 0 6px ${activeLevel.color}` }}
        />
        <span className="text-xs text-text-secondary">{activeLevel.label}</span>
        {saving && <Loader size={10} className="animate-spin" style={{ color: "var(--text-muted)" }} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-text-muted">Supervision Level</div>
      <div className="grid grid-cols-2 gap-2">
        {LEVELS.map(({ level, label, description, color }) => {
          const isActive = currentLevel === level;
          return (
            <button
              key={level}
              onClick={() => handleSelect(level)}
              disabled={saving}
              className="flex flex-col gap-1 p-3 rounded-lg border transition-all duration-200 text-left"
              style={{
                backgroundColor: isActive ? `${color}15` : "var(--bg-elevated)",
                borderColor: isActive ? color : "var(--border-subtle)",
                boxShadow: isActive ? `0 0 12px ${color}33` : "none",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving && !isActive ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: isActive ? `0 0 6px ${color}` : "none",
                  }}
                />
                <span className="text-xs font-medium" style={{ color: isActive ? color : "var(--text-primary)" }}>
                  {label}
                </span>
              </div>
              <span className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}