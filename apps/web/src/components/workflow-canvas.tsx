"use client";

import { useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Plus, Zap, MessageSquare, FileText, BookOpen, Palette, Users, X, Save } from "lucide-react";
import { useRouter } from "next/navigation";

const AGENT_COLORS: Record<string, string> = {
  Orchestrator: "#8b5cf6",
  "Customer Support": "#34d399",
  Sales: "#fbbf24",
  Content: "#a78bfa",
  Training: "#22d3ee",
  Branding: "#fb7185",
};

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: "idle" | "running" | "paused";
}

interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  role: string;
  color: string;
  status: "idle" | "running" | "paused";
  icon: string;
}

function AgentWorkflowNode({ data }: { data: WorkflowNodeData }) {
  return (
    <div
      className="relative px-4 py-3 rounded-xl border-2 min-w-[160px] cursor-move transition-all duration-200 hover:scale-[1.03]"
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: data.color as string,
        boxShadow: `0 0 20px ${data.color as string}33`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-text-muted !w-2 !h-2" />
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: `${data.color as string}22` }}
        >
          {data.icon as string}
        </div>
        <div>
          <div className="text-sm font-medium text-text-primary">{data.label as string}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor:
                  data.status === "running" ? "var(--accent-emerald)" :
                  data.status === "paused" ? "var(--accent-rose)" : "var(--text-muted)",
              }}
            />
            <span className="text-xs text-text-muted">{data.role as string}</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-text-muted !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { agentNode: AgentWorkflowNode };

const WORKFLOW_TEMPLATES = [
  {
    id: "customer-flow",
    name: "Customer Request Flow",
    description: "CSKH → Sales handoff on upgrade interest",
    nodes: [
      { id: "n1", position: { x: 100, y: 100 }, data: { label: "CSKH Agent", role: "Customer Support", color: "#34d399", status: "idle", icon: "💬" } },
      { id: "n2", position: { x: 400, y: 200 }, data: { label: "Sales Agent", role: "Sales", color: "#fbbf24", status: "idle", icon: "🎯" } },
      { id: "n3", position: { x: 400, y: 0 }, data: { label: "Approval Gate", role: "Approval", color: "#8b5cf6", status: "idle", icon: "⚠️" } },
    ],
    edges: [
      { id: "e1-2", source: "n1", target: "n2", label: "upsell interest", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e1-3", source: "n1", target: "n3", label: "refund >$50", markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
  {
    id: "content-pipeline",
    name: "Content Pipeline",
    description: "Brief → Draft → Review → Publish",
    nodes: [
      { id: "n1", position: { x: 0, y: 150 }, data: { label: "Content Agent", role: "Content", color: "#a78bfa", status: "idle", icon: "✍️" } },
      { id: "n2", position: { x: 300, y: 150 }, data: { label: "Branding Agent", role: "Branding", color: "#fb7185", status: "idle", icon: "🎨" } },
      { id: "n3", position: { x: 600, y: 150 }, data: { label: "CEO Review", role: "Orchestrator", color: "#8b5cf6", status: "idle", icon: "🤖" } },
    ],
    edges: [
      { id: "e1-2", source: "n1", target: "n2", label: "draft complete", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e2-3", source: "n2", target: "n3", label: "approved", markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
];

interface WorkflowCanvasProps {
  agents: AgentNode[];
  className?: string;
}

export function WorkflowCanvas({ agents, className }: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>(WORKFLOW_TEMPLATES[0].nodes as Node<WorkflowNodeData>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(WORKFLOW_TEMPLATES[0].edges as Edge[]);
  const [selectedTemplate, setSelectedTemplate] = useState(WORKFLOW_TEMPLATES[0].id);
  const [addMode, setAddMode] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeRole, setNewNodeRole] = useState("");
  const router = useRouter();

  function loadTemplate(templateId: string) {
    const tpl = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplate(templateId);
    setNodes(tpl.nodes as Node<WorkflowNodeData>[]);
    setEdges(tpl.edges as Edge[]);
    setAddMode(false);
  }

  function handleConnect(params: Parameters<typeof addEdge>[0]) {
    setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }

  function addAgentNode() {
    if (!newNodeLabel.trim()) return;
    const color = AGENT_COLORS[newNodeRole] || "#8b5cf6";
    const newNode = {
      id: `node-${Date.now()}`,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 50 },
      data: { label: newNodeLabel, role: newNodeRole || "Agent", color, status: "idle" as const, icon: "🤖" },
    };
    setNodes((nds) => [...nds, newNode as Node<WorkflowNodeData>]);
    setNewNodeLabel("");
    setNewNodeRole("");
    setAddMode(false);
  }

  return (
    <Card className={`glass-card ${className || ""}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap size={16} style={{ color: "var(--accent-violet)" }} />
            Workflow Canvas
            <Badge variant="outline" className="text-xs ml-1">{nodes.length} nodes</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddMode(!addMode)}
              className="gap-1"
            >
              <Plus size={12} /> Add Node
            </Button>
            <select
              value={selectedTemplate}
              onChange={(e) => loadTemplate(e.target.value)}
              className="px-2 py-1 rounded border text-xs bg-transparent"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              {WORKFLOW_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Add node form */}
        {addMode && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg border"
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-accent)" }}
          >
            <Input
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              placeholder="Node label"
              className="flex-1 text-xs"
            />
            <select
              value={newNodeRole}
              onChange={(e) => setNewNodeRole(e.target.value)}
              className="px-2 py-1 rounded border text-xs bg-transparent"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              <option value="">Select role</option>
              {Object.keys(AGENT_COLORS).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Button size="sm" onClick={addAgentNode} className="gap-1" style={{ backgroundColor: "var(--accent-violet)" }}>
              <Save size={11} /> Add
            </Button>
            <button onClick={() => setAddMode(false)} className="p-1 text-text-muted hover:text-text-secondary">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Canvas */}
        <div
          className="rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--border-subtle)", height: 400 }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            style={{ backgroundColor: "var(--bg-base)" }}
          >
            <Background color="rgba(255,255,255,0.04)" gap={20} />
            <Controls className="!bg-bg-elevated !border-border rounded-lg" />
            <MiniMap
              className="!bg-bg-elevated !border-border rounded-lg"
              nodeColor={(n) => (n.data as WorkflowNodeData).color || "#8b5cf6"}
              maskColor="rgba(0,0,0,0.5)"
            />
          </ReactFlow>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-text-muted">
          <span>Drag nodes to reposition</span>
          <span>•</span>
          <span>Click + drag from bottom handle to connect</span>
          <span>•</span>
          <span>Double-click label to rename</span>
        </div>
      </CardContent>
    </Card>
  );
}