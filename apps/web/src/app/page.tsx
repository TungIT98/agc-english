"use client";

import { useState, useEffect } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { StatsBar } from "@/components/stats-bar";
import { AgentGrid } from "@/components/agent-grid";
import { fetchAgents, Agent } from "@/lib/api";

const ROLE_COLORS: Record<string, string> = {
  Orchestrator: "#6366f1",
  "Customer Support": "#22c55e",
  Sales: "#f59e0b",
  Content: "#8b5cf6",
  Training: "#06b6d4",
  Branding: "#ec4899",
};

const ROLE_SHORT: Record<string, string> = {
  Orchestrator: "CEO",
  "Customer Support": "CSKH",
  Sales: "Sales",
  Content: "Content",
  Training: "Training",
  Branding: "Brand",
};

function OrgNode({ data }: { data: { label: string; role: string; status: string; budgetPct: number } }) {
  const color = ROLE_COLORS[data.role] || "#6366f1";
  const dotColor = data.status === "running" ? "var(--success)" : data.status === "paused" ? "var(--error)" : "var(--text-secondary)";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-full font-bold text-xs"
        style={{
          background: `linear-gradient(135deg, ${color}44, ${color}88)`,
          border: `2px solid ${color}`,
          color: "white",
          boxShadow: `0 0 16px ${color}44`,
        }}
      >
        {data.label}
      </div>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{data.label}</span>
      </div>
      <div className="h-1 w-14 rounded-full overflow-hidden mt-0.5" style={{ backgroundColor: "var(--border)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, data.budgetPct)}%`,
            backgroundColor: data.budgetPct >= 100 ? "var(--error)" : data.budgetPct >= 80 ? "var(--warning)" : "var(--success)",
          }}
        />
      </div>
    </div>
  );
}

const nodeTypes = { orgNode: OrgNode };

function buildNodes(agents: Agent[]): Node[] {
  const cx = 500, cy = 180, r = 200;
  const subAgents = agents.filter((a) => a.role !== "Orchestrator");
  const angleStep = (2 * Math.PI) / Math.max(subAgents.length, 1);
  const nodes: Node[] = [];

  const ceo = agents.find((a) => a.role === "Orchestrator");
  if (ceo) {
    const budgetPct = Math.round((ceo.spentMonthlyCents / ceo.budgetMonthlyCents) * 100);
    nodes.push({
      id: ceo.id, position: { x: cx, y: cy },
      data: { label: "CEO", role: ceo.role, status: ceo.status, budgetPct },
      style: { background: "transparent", border: "none" },
    });
  }

  subAgents.forEach((agent, i) => {
    const angle = -Math.PI / 2 + (i - Math.floor(subAgents.length / 2)) * angleStep;
    const budgetPct = Math.round((agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100);
    nodes.push({
      id: agent.id,
      position: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) },
      data: { label: ROLE_SHORT[agent.role] || agent.role, role: agent.role, status: agent.status, budgetPct },
      style: { background: "transparent", border: "none" },
    });
  });

  return nodes;
}

function buildEdges(agents: Agent[]): Edge[] {
  const ceo = agents.find((a) => a.role === "Orchestrator");
  if (!ceo) return [];
  return agents
    .filter((a) => a.id !== ceo.id)
    .map((a) => ({ id: `e-${ceo.id}-${a.id}`, source: ceo.id, target: a.id, style: { stroke: "#1e1e2e", strokeWidth: 1.5 } }));
}

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  useEffect(() => {
    fetchAgents().then((a) => {
      setAgents(a);
      setNodes(buildNodes(a));
      setEdges(buildEdges(a));
    });
  }, []);

  return (
    <>
      <StatsBar />
      <div className="bg-surface border border-border rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-text-secondary">Org Chart</h2>
        <div className="h-96">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodeTypes={nodeTypes}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <Background color="#1e1e2e" gap={20} />
          </ReactFlow>
        </div>
      </div>
      <AgentGrid />
    </>
  );
}