"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components";
import { Sheet } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { SSEProvider, useSSE } from "@/lib/sse-context";
import { CommandPalette } from "@/components/command-palette";

function SSEIndicator() {
  const { connected } = useSSE();
  return (
    <div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: connected ? "var(--success)" : "var(--error)" }}
      title={connected ? "Real-time connected" : "Real-time disconnected"}
    />
  );
}

interface PageWrapperProps {
  children: React.ReactNode;
}

function PageWrapperInner({ children }: PageWrapperProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdKOpen, setCmdKOpen] = useState(false);

  // Global Cmd+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdKOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile page content */}
      <main className="md:hidden flex flex-col flex-1 min-w-0 overflow-auto">{children}</main>

      {/* Desktop page content */}
      <main className="hidden md:flex flex-col flex-1 min-w-0 overflow-auto">{children}</main>

      {/* Command palette */}
      <CommandPalette open={cmdKOpen} onClose={() => setCmdKOpen(false)} />
    </div>
  );
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <SSEProvider>
      <PageWrapperInner>{children}</PageWrapperInner>
    </SSEProvider>
  );
}