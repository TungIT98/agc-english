"use client";

import { useEffect, useState } from "react";
import AgentCard from "./agent-card";
import { fetchAgents, Agent } from "@/lib/api";

export function AgentGrid() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetchAgents().then(setAgents);
    const interval = setInterval(() => fetchAgents().then(setAgents), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4 text-text-secondary">Agents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}