"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface SSEContextType {
  connected: boolean;
  events: SSEEvent[];
  lastEvent: SSEEvent | null;
}

const SSEContext = createContext<SSEContextType>({
  connected: false,
  events: [],
  lastEvent: null,
});

export function SSEProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://agc-english-api.thanhtungtran364.workers.dev";
    const url = `${apiBase}/api/events/stream`;

    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let reconnectDelay = 1000;

    function connect() {
      es = new EventSource(url);
      es.onopen = () => {
        setConnected(true);
        reconnectDelay = 1000; // reset on success
      };
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          const event: SSEEvent = {
            type: "message",
            data: payload,
            timestamp: Date.now(),
          };
          setEvents((prev) => [event, ...prev].slice(0, 100)); // keep last 100
          setLastEvent(event);
        } catch {
          // ignore parse errors
        }
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        // Exponential backoff reconnect
        reconnectTimer = setTimeout(connect, Math.min(reconnectDelay, 30000));
        reconnectDelay = reconnectDelay * 2;
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, []);

  return (
    <SSEContext.Provider value={{ connected, events, lastEvent }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  return useContext(SSEContext);
}