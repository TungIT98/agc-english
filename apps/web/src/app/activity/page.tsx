"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://agc-english-api.thanhtungtran364.workers.dev";

interface Activity {
  id: string;
  agentId: string | null;
  agentName: string | null;
  eventType: string;
  description: string;
  metadata: string | null;
  createdAt: string;
}

const EVENT_COLORS: Record<string, string> = {
  agent_query: "var(--primary)",
  task_created: "var(--success)",
  task_updated: "var(--warning)",
  approval_requested: "var(--warning)",
  approval_approved: "var(--success)",
  approval_rejected: "var(--error)",
  budget_warning: "#f59e0b",
  budget_exceeded: "var(--error)",
  general: "var(--text-secondary)",
};

const EVENT_LABELS: Record<string, string> = {
  agent_query: "Agent Query",
  task_created: "Task Created",
  task_updated: "Task Updated",
  approval_requested: "Approval Request",
  approval_approved: "Approved",
  approval_rejected: "Rejected",
  budget_warning: "Budget Warning",
  budget_exceeded: "Budget Exceeded",
  general: "Activity",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/activity?limit=100`)
      .then((r) => r.json())
      .then((d) => {
        setActivities(d.activities ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = activities.filter((a) => !filter || a.eventType === filter);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Activity Timeline</h1>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 rounded border border-border bg-transparent text-sm"
          >
            <option value="">All Events</option>
            <option value="agent_query">Agent Query</option>
            <option value="task_created">Task Created</option>
            <option value="task_updated">Task Updated</option>
            <option value="approval_approved">Approved</option>
            <option value="approval_rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-text-secondary">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-text-secondary">No activity recorded yet.</div>
          <div className="text-sm text-text-secondary mt-2">Agent queries and task actions will appear here.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 rounded-lg border"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div
                className="w-2 h-2 rounded-full mt-2 shrink-0"
                style={{ backgroundColor: EVENT_COLORS[activity.eventType] || "var(--text-secondary)" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${EVENT_COLORS[activity.eventType] || "var(--text-secondary)"}22`, color: EVENT_COLORS[activity.eventType] || "var(--text-secondary)" }}
                  >
                    {EVENT_LABELS[activity.eventType] || activity.eventType}
                  </span>
                  {activity.agentName && (
                    <span className="text-xs text-text-secondary">{activity.agentName}</span>
                  )}
                  <span className="text-xs text-text-secondary ml-auto">{timeAgo(activity.createdAt)}</span>
                </div>
                <div className="text-sm text-text-primary">{activity.description}</div>
                {activity.metadata && (
                  <pre className="text-xs text-text-secondary mt-1 overflow-x-auto">{activity.metadata}</pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}