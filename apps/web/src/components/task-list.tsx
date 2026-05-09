"use client";

import { Task } from "@/lib/api";
import { Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} style={{ color: "var(--warning)" }} />,
  in_progress: <Loader2 size={14} className="animate-spin" style={{ color: "var(--primary)" }} />,
  done: <CheckCircle2 size={14} style={{ color: "var(--success)" }} />,
  blocked: <AlertCircle size={14} style={{ color: "var(--error)" }} />,
};

const PRIORITY_LABELS = ["", "P1", "P2", "P3"];

export default function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 p-3 rounded-lg border"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          {STATUS_ICONS[task.status]}
          <div className="flex flex-col flex-1">
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              {task.title}
            </span>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {new Date(task.updatedAt).toLocaleString()}
            </span>
          </div>
          {task.priority > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded font-bold"
              style={{
                backgroundColor: "var(--warning)22",
                color: "var(--warning)",
              }}
            >
              {PRIORITY_LABELS[task.priority] || `P${task.priority}`}
            </span>
          )}
        </div>
      ))}
      {tasks.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>
          No tasks
        </p>
      )}
    </div>
  );
}
