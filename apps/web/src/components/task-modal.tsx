"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NewTask = { id: string; title: string; description?: string; status: "pending" | "in_progress" | "done" | "blocked"; priority: number; createdAt: string; updatedAt: string };

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (task: NewTask) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://agc-english-api.thanhtungtran364.workers.dev";

export function TaskModal({ open, onClose, onCreated }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data.task ?? { id: Date.now().toString(), title, description, status: "pending" as const, priority, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        setTitle("");
        setDescription("");
        setPriority(0);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Add a new task to the board.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description (optional)"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Priority (0-3)</label>
            <Input
              type="number"
              min={0}
              max={3}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-32"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !title.trim()}>{loading ? "Creating..." : "Create Task"}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}