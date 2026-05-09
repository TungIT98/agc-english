import { Hono } from "hono";
import { cors } from "./middleware/cors";
import { agentsRouter } from "./routes/agents";
import { tasksRouter } from "./routes/tasks";
import { costsRouter } from "./routes/costs";
import { approvalsRouter } from "./routes/approvals";
import { settingsRouter } from "./routes/settings";
import { activityRouter } from "./routes/activity";
import { eventsRouter } from "./routes/events";
import { alertsRouter } from "./routes/alerts";
import { governanceRouter } from "./routes/governance";
import { workflowsRouter } from "./routes/workflows";
import { youtubeRouter } from "./routes/youtube";
import { getMetrics, computeHitRate } from "./services/cache";

export interface Env {
  DB: D1Database;
  agc_english_cache: KVNamespace;
  MINIMAX_API_KEY: string;
  MINIMAX_API_URL: string;
  ZALO_API_KEY: string;
  CRM_API_KEY: string;
  CRM_API_URL: string;
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use(cors);

app.route("/api/agents", agentsRouter);
app.route("/api/tasks", tasksRouter);
app.route("/api/costs", costsRouter);
app.route("/api/approvals", approvalsRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/activity", activityRouter);
app.route("/api/events", eventsRouter);
app.route("/api/alerts", alertsRouter);
app.route("/api/governance", governanceRouter);
app.route("/api/workflows", workflowsRouter);
app.route("/api/youtube", youtubeRouter);

app.get("/", (c) =>
  c.json({
    name: "AGC_English API",
    version: "1.0",
    status: "operational",
    endpoints: [
      "/api/health",
      "/api/agents",
      "/api/tasks",
      "/api/costs/summary",
      "/api/approvals",
      "/api/settings",
      "/api/activity",
      "/api/events/stream",
      "/api/alerts",
      "/api/governance/stats",
      "/api/workflows",
      "/api/youtube",
    ],
  })
);

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/api/cache/metrics", async (c) => {
  const kv = c.env.agc_english_cache as KVNamespace;
  const metrics = await getMetrics(kv);
  return c.json({ ...metrics, hit_rate: computeHitRate(metrics) });
});

export default app;
