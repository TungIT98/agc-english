import { Hono } from "hono";
import type { Env } from "../index";

const router = new Hono<{ Bindings: Env }>();

// YouTube Data API v3 helper — returns null if key not configured
function youtubeApiKey(env: Env): string | null {
  return (env as unknown as Record<string, string>).YOUTUBE_API_KEY ?? null;
}

// GET /api/youtube/channel/:channelId/stats
router.get("/channel/:channelId/stats", async (c) => {
  const channelId = c.req.param("channelId");
  const apiKey = youtubeApiKey(c.env);

  if (!apiKey) {
    return c.json({
      channelId,
      subscriberCount: 0,
      viewCount: 0,
      videoCount: 0,
      hiddenSubscriberCount: false,
      trendingVideoId: null,
      source: "unconfigured",
      note: "Set YOUTUBE_API_KEY in wrangler secrets to enable live data",
    });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=${encodeURIComponent(channelId)}&key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      return c.json({ error: `YouTube API error: ${res.status}` }, res.status as 400 | 500);
    }

    const data = (await res.json()) as {
      items?: Array<{
        statistics?: {
          subscriberCount: string;
          viewCount: string;
          videoCount: string;
          hiddenSubscriberCount: boolean;
        };
        contentDetails?: {
          relatedPlaylists?: { uploads: string };
        };
      }>;
      error?: { message: string };
    };

    if (data.error) {
      return c.json({ error: data.error.message }, 500);
    }

    const item = data.items?.[0];
    if (!item) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const stats: {
      subscriberCount: string;
      viewCount: string;
      videoCount: string;
      hiddenSubscriberCount: boolean;
    } = item.statistics ?? { subscriberCount: "0", viewCount: "0", videoCount: "0", hiddenSubscriberCount: false };
    const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads ?? null;

    // Fetch latest video ID from uploads playlist for trending context
    let latestVideoId: string | null = null;
    if (uploadsPlaylistId && apiKey) {
      try {
        const plRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=1&key=${apiKey}`
        );
        if (plRes.ok) {
          const plData = (await plRes.json()) as {
            items?: Array<{ snippet?: { resourceId?: { videoId?: string } } }>;
          };
          latestVideoId = plData.items?.[0]?.snippet?.resourceId?.videoId ?? null;
        }
      } catch {
        // non-fatal
      }
    }

    return c.json({
      channelId,
      subscriberCount: parseInt(stats.subscriberCount ?? "0", 10),
      viewCount: parseInt(stats.viewCount ?? "0", 10),
      videoCount: parseInt(stats.videoCount ?? "0", 10),
      hiddenSubscriberCount: stats.hiddenSubscriberCount ?? false,
      latestVideoId,
      source: "live",
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch YouTube data", details: String(err) }, 500);
  }
});

// GET /api/youtube/channel/:channelId/eligibility
router.get("/channel/:channelId/eligibility", async (c) => {
  const channelId = c.req.param("channelId");
  const apiKey = youtubeApiKey(c.env);

  const requirements = {
    minSubscribers: 1000,
    minWatchHours: 4000,
  };

  if (!apiKey) {
    return c.json({
      channelId,
      subscriberCount: 0,
      watchHours: 0,
      subsRequirementMet: false,
      watchHoursRequirementMet: false,
      monetizationEligible: false,
      source: "unconfigured",
    });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=${encodeURIComponent(channelId)}&key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      return c.json({ error: `YouTube API error: ${res.status}` }, res.status as 400 | 500);
    }

    const data = (await res.json()) as {
      items?: Array<{
        statistics?: {
          subscriberCount: string;
          viewCount: string;
          videoCount: string;
          hiddenSubscriberCount: boolean;
        };
        contentDetails?: {
          relatedPlaylists?: { uploads: string };
        };
      }>;
      error?: { message: string };
    };

    if (data.error) {
      return c.json({ error: data.error.message }, 500);
    }

    const item = data.items?.[0];
    if (!item) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const stats: {
      subscriberCount: string;
      viewCount: string;
      videoCount: string;
      hiddenSubscriberCount: boolean;
    } = item.statistics ?? { subscriberCount: "0", viewCount: "0", videoCount: "0", hiddenSubscriberCount: false };
    const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads ?? null;
    const subscriberCount = parseInt(stats.subscriberCount ?? "0", 10);
    const viewCount = parseInt(stats.viewCount ?? "0", 10);

    // Watch hours = total views / 5 (rough estimate since watch hours aren't directly exposed)
    // For exact watch hours we'd need YouTube Analytics API (OAuth scope)
    const estimatedWatchHours = Math.floor(viewCount / 5);

    const subsRequirementMet = subscriberCount >= requirements.minSubscribers;
    const watchHoursRequirementMet = estimatedWatchHours >= requirements.minWatchHours;
    const monetizationEligible = subsRequirementMet && watchHoursRequirementMet;

    let exactWatchHours: number | null = null;

    // Try to get more precise watch hours via content owner / video list if we have upload access
    if (uploadsPlaylistId && apiKey) {
      try {
        // Fetch recent videos to estimate watch hours from top videos
        const plRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`
        );
        if (plRes.ok) {
          const plData = (await plRes.json()) as {
            items?: Array<{ contentDetails?: { videoId: string; videoPublishedAt: string } }>;
          };
          const videoIds = plData.items
            ?.map((i) => i.contentDetails?.videoId)
            .filter(Boolean)
            .join(",") ?? "";

          if (videoIds) {
            const vidRes = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`
            );
            if (vidRes.ok) {
              const vidData = (await vidRes.json()) as {
                items?: Array<{ statistics?: { viewCount: string } }>;
              };
              const totalViews = vidData.items
                ?.reduce((acc, v) => acc + parseInt(v.statistics?.viewCount ?? "0", 10), 0) ?? 0;
              exactWatchHours = Math.floor(totalViews / 5);
            }
          }
        }
      } catch {
        // non-fatal
      }
    }

    return c.json({
      channelId,
      subscriberCount,
      watchHours: exactWatchHours ?? estimatedWatchHours,
      watchHoursMethod: exactWatchHours !== null ? "video_list_sample" : "total_views_estimate",
      subsRequirementMet,
      watchHoursRequirementMet,
      monetizationEligible,
      requirements,
      source: "live",
    });
  } catch (err) {
    return c.json({ error: "Failed to check eligibility", details: String(err) }, 500);
  }
});

// GET /api/youtube/channels — list known channel configs (stored in KV)
router.get("/channels", async (c) => {
  const kv = c.env.agc_english_cache as KVNamespace;
  try {
    const list = await kv.list({ prefix: "yt_channel:" });
    const channels = await Promise.all(
      list.keys.map(async (k) => {
        const raw = await kv.get(k.name);
        return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      })
    );
    return c.json({ channels: channels.filter(Boolean) });
  } catch (err) {
    return c.json({ error: "Failed to list channels", details: String(err) }, 500);
  }
});

// POST /api/youtube/channels — register a tracked channel
router.post("/channels", async (c) => {
  const { channelId, channelName, apiKeyOverride } = await c.req.json<{
    channelId?: string;
    channelName?: string;
    apiKeyOverride?: boolean;
  }>();

  if (!channelId) {
    return c.json({ error: "channelId is required" }, 400);
  }

  const kv = c.env.agc_english_cache as KVNamespace;
  const key = `yt_channel:${channelId}`;
  const record = {
    channelId,
    channelName: channelName ?? channelId,
    apiKeyOverride: apiKeyOverride ?? false,
    addedAt: new Date().toISOString(),
  };

  await kv.put(key, JSON.stringify(record));
  return c.json({ channel: record }, 201);
});

// POST /api/youtube/affiliate/click — log an affiliate link click
router.post("/affiliate/click", async (c) => {
  const kv = c.env.agc_english_cache as KVNamespace;
  const { agentId, videoUrl, linkUrl, affiliateProgram, merchant } = await c.req.json<{
    agentId?: string;
    videoUrl: string;
    linkUrl: string;
    affiliateProgram?: string;
    merchant?: string;
  }>();

  if (!linkUrl) {
    return c.json({ error: "linkUrl is required" }, 400);
  }

  const id = crypto.randomUUID();
  const clickedAt = new Date().toISOString();

  const click: {
    id: string;
    agentId: string | null;
    videoUrl: string;
    linkUrl: string;
    affiliateProgram: string | null;
    merchant: string | null;
    clickedAt: string;
  } = {
    id,
    agentId: agentId ?? null,
    videoUrl: videoUrl ?? "",
    linkUrl,
    affiliateProgram: affiliateProgram ?? null,
    merchant: merchant ?? null,
    clickedAt,
  };

  await kv.put(`click:${id}`, JSON.stringify(click));

  // Update daily aggregate
  const today = clickedAt.slice(0, 10); // YYYY-MM-DD
  const existingDaily = await kv.get(`daily_clicks:${today}`);
  const daily = existingDaily ? (JSON.parse(existingDaily) as Record<string, number>) : {};
  daily.total = (daily.total ?? 0) + 1;
  const progKey = affiliateProgram ?? "_unknown";
  const merchantKey = merchant ?? "_none";
  daily[`prog:${progKey}`] = (daily[`prog:${progKey}`] ?? 0) + 1;
  daily[`merchant:${merchantKey}`] = (daily[`merchant:${merchantKey}`] ?? 0) + 1;
  await kv.put(`daily_clicks:${today}`, JSON.stringify(daily));

  return c.json({ id, clickedAt }, 201);
});

// GET /api/youtube/affiliate/clicks — list affiliate clicks
router.get("/affiliate/clicks", async (c) => {
  const kv = c.env.agc_english_cache as KVNamespace;
  const agentId = c.req.query("agentId") ?? undefined;
  const program = c.req.query("program") ?? undefined;
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  const all = await kv.list({ prefix: "click:", limit: 1000 });
  let clicks = (await Promise.all(
    all.keys.map(async (k) => {
      const raw = await kv.get(k.name);
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    })
  )).filter((c): c is Record<string, unknown> => c !== null);

  // Filter
  if (agentId) clicks = clicks.filter((c) => c.agentId === agentId);
  if (program) clicks = clicks.filter((c) => c.affiliateProgram === program);

  // Sort by clickedAt desc
  clicks.sort((a, b) => (b.clickedAt as string).localeCompare(a.clickedAt as string));

  const count = clicks.length;
  const page = clicks.slice(offset, offset + limit);

  return c.json({ clicks: page, count, limit, offset });
});

// GET /api/youtube/affiliate/stats — aggregate affiliate stats
router.get("/affiliate/stats", async (c) => {
  const kv = c.env.agc_english_cache as KVNamespace;

  const all = await kv.list({ prefix: "click:", limit: 1000 });
  const clicks = await Promise.all(
    all.keys.map(async (k) => {
      const raw = await kv.get(k.name);
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    })
  );
  const valid = (clicks.filter(Boolean) as Record<string, unknown>[]);

  // totalClicks
  const totalClicks = valid.length;

  // byProgram
  const byProgramMap: Record<string, number> = {};
  for (const c of valid) {
    const prog = (c.affiliateProgram as string | null) ?? "_unknown";
    byProgramMap[prog] = (byProgramMap[prog] ?? 0) + 1;
  }
  const byProgram = Object.entries(byProgramMap)
    .map(([affiliate_program, click_count]) => ({ affiliate_program, click_count }))
    .sort((a, b) => b.click_count - a.click_count);

  // byVideo (top 10)
  const byVideoMap: Record<string, number> = {};
  for (const c of valid) {
    const url = (c.videoUrl as string) || "_none";
    byVideoMap[url] = (byVideoMap[url] ?? 0) + 1;
  }
  const byVideo = Object.entries(byVideoMap)
    .map(([video_url, click_count]) => ({ video_url, click_count }))
    .sort((a, b) => b.click_count - a.click_count)
    .slice(0, 10);

  // daily for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const daily: { day: string; clicks: number }[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const raw = await kv.get(`daily_clicks:${dayStr}`);
    const record = raw ? (JSON.parse(raw) as Record<string, number>) : null;
    daily.push({ day: dayStr, clicks: record?.total ?? 0 });
  }

  return c.json({ totalClicks, byProgram, byVideo, daily });
});

export const youtubeRouter = router;