// KV Cache service with TTL refresh and hit-rate metrics
// Note: Cache hit/miss tracking is best-effort - metric keys may not exist on cold start

export interface KVEnv {
  agc_english_cache: KVNamespace;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  ttl_refreshes: number;
  hit_rate: number; // 0-1
}

// In-memory metric counters (reset on worker cold start)
const metrics = {
  hits: 0,
  misses: 0,
  ttl_refreshes: 0,
};

// Session TTL in seconds
const SESSION_TTL = 3600;
// Metrics key prefix (separate from session data)
const METRICS_KEY = "cache:metrics";

export async function getWithMetrics(kv: KVNamespace, key: string): Promise<string | null> {
  const value = await kv.get(key);
  if (value !== null) {
    metrics.hits++;
    await saveMetrics(kv);
  } else {
    metrics.misses++;
  }
  return value;
}

// TTL refresh on read: re-save the same value with fresh TTL to keep active sessions alive
export async function refreshTtl(kv: KVNamespace, key: string): Promise<void> {
  const value = await kv.get(key);
  if (value !== null) {
    await kv.put(key, value, { expirationTtl: SESSION_TTL });
    metrics.ttl_refreshes++;
    await saveMetrics(kv);
  }
}

async function saveMetrics(kv: KVNamespace): Promise<void> {
  try {
    await kv.put(METRICS_KEY, JSON.stringify(metrics), { expirationTtl: 86400 });
  } catch {
    // metrics save is best-effort
  }
}

export async function getMetrics(kv: KVNamespace): Promise<CacheMetrics> {
  try {
    const raw = await kv.get(METRICS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        hits: saved.hits ?? metrics.hits,
        misses: saved.misses ?? metrics.misses,
        ttl_refreshes: saved.ttl_refreshes ?? metrics.ttl_refreshes,
        hit_rate: 0, // computed below
      };
    }
  } catch {
    // fall through
  }
  return {
    hits: metrics.hits,
    misses: metrics.misses,
    ttl_refreshes: metrics.ttl_refreshes,
    hit_rate: 0,
  };
}

export function computeHitRate(metrics: CacheMetrics): number {
  const total = metrics.hits + metrics.misses;
  return total > 0 ? metrics.hits / total : 0;
}

export async function getSession(kv: KVNamespace, sessionId: string) {
  const key = `session:${sessionId}`;
  const value = await getWithMetrics(kv, key);
  if (value) {
    // Refresh TTL on access to keep active sessions alive
    await refreshTtl(kv, key);
  }
  return value ? JSON.parse(value) : null;
}

export async function setSession(kv: KVNamespace, sessionId: string, data: unknown) {
  const key = `session:${sessionId}`;
  await kv.put(key, JSON.stringify(data), { expirationTtl: SESSION_TTL });
  // TTL refresh on write is implicit — next read will refresh
}

export async function deleteSession(kv: KVNamespace, sessionId: string) {
  await kv.delete(`session:${sessionId}`);
}
