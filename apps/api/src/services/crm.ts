// CRM API integration service for Sales lead management
// Supports generic REST CRM backends (HubSpot-compatible, custom, etc.)

export interface CRMEnv {
  CRM_API_KEY: string;
  CRM_API_URL?: string; // e.g. https://api.hubspot.com for HubSpot
}

// Default CRM URL — override via CRM_API_URL env var
const DEFAULT_CRM_URL = "https://api.example-crm.com/v1";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "new" | "contacted" | "qualified" | "lost";
  notes?: string;
  created_at: string;
}

export interface UpdateLeadResult {
  success: boolean;
  lead?: Lead;
  error?: string;
}

/**
 * Update a lead status in the CRM backend.
 * Requires CRM_API_KEY secret via `wrangler secret put CRM_API_KEY`
 *
 * When CRM_API_KEY is not configured (stub mode), returns success=true with mock lead.
 */
export async function updateLead(
  env: CRMEnv,
  leadId: string,
  status: string,
  notes?: string
): Promise<UpdateLeadResult> {
  const apiKey = env.CRM_API_KEY;
  const baseUrl = env.CRM_API_URL || DEFAULT_CRM_URL;

  // Stub mode: no API key configured
  if (!apiKey) {
    console.warn("[CRM] CRM_API_KEY not configured — using stub response");
    return {
      success: true,
      lead: {
        id: leadId,
        name: "Unknown Lead",
        email: "",
        status: status as Lead["status"],
        notes,
        created_at: new Date().toISOString(),
      },
    };
  }

  try {
    const response = await fetch(`${baseUrl}/leads/${leadId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ status, notes }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `CRM API error ${response.status}: ${errText}` };
    }

    const data = await response.json() as Lead;
    return { success: true, lead: data };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Create a new lead in the CRM.
 */
export async function createLead(
  env: CRMEnv,
  name: string,
  email: string,
  phone?: string,
  notes?: string
): Promise<UpdateLeadResult> {
  const apiKey = env.CRM_API_KEY;
  const baseUrl = env.CRM_API_URL || DEFAULT_CRM_URL;

  if (!apiKey) {
    console.warn("[CRM] CRM_API_KEY not configured — using stub response");
    return {
      success: true,
      lead: {
        id: `lead_stub_${crypto.randomUUID().slice(0, 8)}`,
        name,
        email,
        phone,
        status: "new",
        notes,
        created_at: new Date().toISOString(),
      },
    };
  }

  try {
    const response = await fetch(`${baseUrl}/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ name, email, phone, notes }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `CRM API error ${response.status}: ${errText}` };
    }

    const data = await response.json() as Lead;
    return { success: true, lead: data };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}