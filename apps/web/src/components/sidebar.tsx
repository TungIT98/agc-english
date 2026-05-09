"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bot, ListTodo, DollarSign, CheckCircle, Settings, ActivitySquare, MessageSquare, Youtube } from "lucide-react";

const navItems = [
  { href: "/", label: "HOME", icon: Home },
  { href: "/chat", label: "CHAT", icon: MessageSquare },
  { href: "/agents", label: "AGENTS", icon: Bot },
  { href: "/tasks", label: "TASKS", icon: ListTodo },
  { href: "/costs", label: "COSTS", icon: DollarSign },
  { href: "/approvals", label: "APPROVE", icon: CheckCircle },
  { href: "/activity", label: "ACTIVITY", icon: ActivitySquare },
  { href: "/youtube", label: "YOUTUBE", icon: Youtube },
  { href: "/settings", label: "SETTINGS", icon: Settings },
];

export default function Sidebar({ onMobileClose }: { onMobileClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-48 h-full border-r"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center h-16 px-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-base font-bold tracking-widest" style={{ color: "var(--primary)" }}>
          AGC
        </span>
        <span className="ml-1 text-base font-light" style={{ color: "var(--text-primary)" }}>
          _English
        </span>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
              style={{
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                backgroundColor: isActive ? "rgba(99,102,241,0.1)" : "transparent",
                borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
              }}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div
        className="px-4 py-3 text-xs border-t"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        Multi-Agent v1.0
      </div>
    </aside>
  );
}