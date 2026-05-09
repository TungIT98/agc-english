"use client";

import { useEffect, useState } from "react";
import { fetchTasks, Task } from "@/lib/api";
import { Clock, Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { TaskModal } from "@/components/task-modal";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "var(--warning)" },
  in_progress: { label: "In Progress", icon: Loader2, color: "var(--primary)" },
  done: { label: "Done", icon: CheckCircle2, color: "var(--success)" },
  blocked: { label: "Blocked", icon: AlertCircle, color: "var(--error)" },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  useEffect(() => { fetchTasks().then(setTasks); }, []);
  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const groups = {
    pending: filtered.filter((t) => t.status === "pending"),
    in_progress: filtered.filter((t) => t.status === "in_progress"),
    done: filtered.filter((t) => t.status === "done"),
    blocked: filtered.filter((t) => t.status === "blocked"),
  };
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Tasks</h1>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="px-3 py-1.5 rounded border border-border bg-transparent text-sm w-48 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded border border-border bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus size={14} />New Task
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {(["pending", "in_progress", "done", "blocked"] as const).map((status) => {
          const config = STATUS_CONFIG[status];
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <config.icon size={14} style={{ color: config.color }} />
                <span className="text-sm font-medium" style={{ color: config.color }}>{config.label}</span>
                <span className="text-xs text-text-secondary">({groups[status].length})</span>
              </div>
              <div className="flex flex-col gap-2">
                {groups[status].map((task) => (
                  <div key={task.id} className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-sm font-medium text-text-primary">{task.title}</div>
                    {task.priority > 0 && (
                      <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded" style={{ backgroundColor: "var(--warning)22", color: "var(--warning)" }}>P{task.priority}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <TaskModal open={showModal} onClose={() => setShowModal(false)} onCreated={(t) => setTasks((prev) => [...prev, t])} />
    </>
  );
}
