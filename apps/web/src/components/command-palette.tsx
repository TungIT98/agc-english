"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchAgents, fetchTasks } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Users, FileText, BarChart2, Settings, MessageSquare,
  CreditCard, CheckSquare, Shield, ChevronRight, Bot, LayoutDashboard, ArrowRight
} from "lucide-react";

interface CommandItem {
  id: string;
  type: "page" | "agent" | "task" | "action";
  label: string;
  description: string;
  icon: string;
  action: (router: ReturnType<typeof useRouter>) => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const PAGE_COMMANDS: CommandItem[] = [
  { id: "page-dashboard", type: "page", label: "Dashboard", description: "Overview and org chart", icon: "🏠", action: (router) => router.push("/") },
  { id: "page-agents", type: "page", label: "Agents", description: "Manage AI agents", icon: "🤖", action: (router) => router.push("/agents") },
  { id: "page-tasks", type: "page", label: "Tasks", description: "View and manage tasks", icon: "✅", action: (router) => router.push("/tasks") },
  { id: "page-chat", type: "page", label: "Chat", description: "Chat with agents", icon: "💬", action: (router) => router.push("/chat") },
  { id: "page-costs", type: "page", label: "Costs", description: "Budget and spending", icon: "💰", action: (router) => router.push("/costs") },
  { id: "page-activity", type: "page", label: "Activity", description: "Activity timeline and audit log", icon: "📊", action: (router) => router.push("/activity") },
  { id: "page-approvals", type: "page", label: "Approvals", description: "Pending approvals", icon: "📋", action: (router) => router.push("/approvals") },
  { id: "page-settings", type: "page", label: "Settings", description: "Company and agent settings", icon: "⚙️", action: (router) => router.push("/settings") },
];

const TYPE_ICONS: Record<string, string> = {
  page: "📄",
  agent: "🤖",
  task: "✅",
  action: "⚡",
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CommandItem[]>(PAGE_COMMANDS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      loadDynamicItems();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  async function loadDynamicItems() {
    setLoading(true);
    try {
      const [agents, tasks] = await Promise.all([fetchAgents(), fetchTasks()]);
      const agentItems: CommandItem[] = agents.slice(0, 6).map((a) => ({
        id: `agent-${a.id}`,
        type: "agent",
        label: a.name,
        description: a.role,
        icon: "🤖",
        action: (router) => router.push("/chat"),
      }));
      const taskItems: CommandItem[] = tasks.slice(0, 4).map((t) => ({
        id: `task-${t.id}`,
        type: "task",
        label: t.title,
        description: t.status,
        icon: "✅",
        action: (router) => router.push("/tasks"),
      }));
      setItems([...PAGE_COMMANDS, ...agentItems, ...taskItems]);
    } catch {
      setItems(PAGE_COMMANDS);
    } finally {
      setLoading(false);
    }
  }

  function filterItems(q: string): CommandItem[] {
    if (!q.trim()) return items.slice(0, 8);
    const lower = q.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.description.toLowerCase().includes(lower)
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const filtered = filterItems(query);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (item) execute(item);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  function execute(item: CommandItem) {
    item.action(router);
    onClose();
  }

  const filtered = filterItems(query);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl rounded-xl border overflow-hidden shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderColor: "var(--border-accent)",
          boxShadow: "0 0 40px rgba(139,92,246,0.2)",
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <Search size={16} style={{ color: "var(--accent-violet)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, agents, tasks… (↑↓ to navigate, ↵ to select, Esc to close)"
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            style={{ background: "none" }}
          />
          <Badge variant="outline" className="text-xs shrink-0">Cmd+K</Badge>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && !loading && (
            <div className="py-8 text-center text-sm text-text-muted">
              No results for "{query}"
            </div>
          )}

          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={() => execute(item)}
              onMouseEnter={() => setSelectedIndex(i)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{
                backgroundColor: i === selectedIndex ? "var(--bg-hover)" : "transparent",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: "var(--bg-active)" }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary">{item.label}</div>
                <div className="text-xs text-text-muted">{item.description}</div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{item.type}</Badge>
              {i === selectedIndex && (
                <ChevronRight size={12} style={{ color: "var(--accent-violet)" }} />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-t text-xs text-text-muted"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}