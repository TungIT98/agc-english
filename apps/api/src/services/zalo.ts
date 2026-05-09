// Zalo API integration service for CSKH notifications
// Docs: https://developers.zalo.me/docs/

export interface ZaloEnv {
  ZALO_API_KEY: string;
}

// Zalo API base URL
const ZALO_API_URL = "https://openapi.zalo.me";

export interface ZaloSendResult {
  success: boolean;
  zaloId?: string;
  error?: string;
}

/**
 * Send a notification message via Zalo.
 * Requires ZALO_API_KEY secret via `wrangler secret put ZALO_API_KEY`
 *
 * When API key is not configured (stub mode), returns success=true with mock zaloId.
 */
export async function sendZaloMessage(
  env: ZaloEnv,
  phone: string,
  message: string
): Promise<ZaloSendResult> {
  const apiKey = env.ZALO_API_KEY;

  // Stub mode: no API key configured
  if (!apiKey) {
    console.warn("[Zalo] ZALO_API_KEY not configured — using stub response");
    return {
      success: true,
      zaloId: `zalo_stub_${Date.now()}`,
    };
  }

  try {
    const response = await fetch(`${ZALO_API_URL}/v3/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Zalo API error ${response.status}: ${errText}` };
    }

    const data = await response.json() as { success?: boolean; error?: string };
    if (!data.success) {
      return { success: false, error: data.error ?? "Unknown Zalo error" };
    }

    return { success: true, zaloId: `zalo_${Date.now()}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}