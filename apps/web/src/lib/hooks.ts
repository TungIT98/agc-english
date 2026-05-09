"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAgents, Agent, fetchTasks, Task, fetchCosts, CostSummary } from "@/lib/api";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    fetchAgents()
      .then((a) => { setAgents(a); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, []);

  return { agents, loading, error, reload };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    fetchTasks()
      .then((t) => { setTasks(t); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, []);

  return { tasks, loading, error, reload };
}

export function useCosts() {
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    fetchCosts()
      .then((c) => { setCosts(c); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, []);

  return { costs, loading, error, reload };
}