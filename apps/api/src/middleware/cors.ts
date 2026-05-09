import { Context, Next } from "hono";

const ALLOWED_ORIGINS = [
  "https://agc-english.fly.dev",
  "http://localhost:3000",
  "http://localhost:3457",
];

export async function cors(c: Context, next: Next) {
  const origin = c.req.header("Origin");

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    c.header("Access-Control-Max-Age", "86400");
  }

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
}
