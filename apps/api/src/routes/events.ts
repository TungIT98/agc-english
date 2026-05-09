import { Hono } from "hono";
import type { Env } from "../index";

const router = new Hono<{ Bindings: Env }>();

// In-memory pub/sub for SSE (per-worker, short-lived but works for demo)
const subscribers = new Set<((data: string) => void)>();

function broadcast(eventType: string, data: Record<string, unknown>) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const cb of subscribers) {
    try { cb(payload); } catch { /* drop dead subscribers */ }
  }
}

// Expose broadcast for use by other routes
export function emitSSEEvent(eventType: string, data: Record<string, unknown>) {
  broadcast(eventType, data);
}

router.get("/stream", async (c) => {
  let closeCb: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Client disconnected
        }
      }

      // Send initial connection ping
      send(": connected\n\n");

      // Keep-alive ping every 30s
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      subscribers.add(send);

      closeCb = () => {
        clearInterval(keepAlive);
        subscribers.delete(send);
      };
    },
    cancel() {
      closeCb?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

export { subscribers, broadcast };
export const eventsRouter = router;