// Notion API integration service for Content calendar
// Docs: https://developers.notion.com/

export interface NotionEnv {
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID?: string;
}

// Notion API base URL
const NOTION_API_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export interface Lesson {
  id?: string;
  title: string;
  content: string;
  status: "draft" | "published";
  tags?: string[];
  createdAt?: string;
}

export interface CreateLessonResult {
  success: boolean;
  lesson?: Lesson;
  error?: string;
}

/**
 * Save a lesson to a Notion database.
 * Requires NOTION_API_KEY secret via `wrangler secret put NOTION_API_KEY`
 *
 * When API key is not configured (stub mode), returns success=true with mock lesson.
 */
export async function createNotionLesson(
  env: NotionEnv,
  title: string,
  content: string,
  tags?: string[]
): Promise<CreateLessonResult> {
  const apiKey = env.NOTION_API_KEY;

  // Stub mode: no API key configured
  if (!apiKey) {
    console.warn("[Notion] NOTION_API_KEY not configured — using stub response");
    return {
      success: true,
      lesson: {
        id: `notion_stub_${crypto.randomUUID().slice(0, 8)}`,
        title,
        content,
        status: "draft",
        tags,
        createdAt: new Date().toISOString(),
      },
    };
  }

  try {
    // Use Notion parent+page creation API
    // In production, you'd pass a NOTION_DATABASE_ID env var to target a specific DB
    const response = await fetch(`${NOTION_API_URL}/pages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DATABASE_ID || "default" },
        properties: {
          title: {
            title: [{ type: "text", text: { content: title } }],
          },
          status: {
            select: { name: "Draft" },
          },
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: content.slice(0, 2000) } }],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Notion API error ${response.status}: ${errText}` };
    }

    const data = await response.json() as { id?: string };
    return {
      success: true,
      lesson: {
        id: data.id,
        title,
        content,
        status: "draft",
        tags,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Query the content calendar Notion database for existing lessons.
 */
export async function queryNotionLessons(
  env: NotionEnv,
  filterStatus?: string
): Promise<{ success: boolean; lessons?: Lesson[]; error?: string }> {
  const apiKey = env.NOTION_API_KEY;

  if (!apiKey) {
    return { success: false, error: "NOTION_API_KEY not configured" };
  }

  try {
    const body: Record<string, unknown> = {
      filter: filterStatus
        ? { property: "status", select: { equals: filterStatus } }
        : undefined,
    };

    const response = await fetch(`${NOTION_API_URL}/databases/${env.NOTION_DATABASE_ID || "default"}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Notion API error ${response.status}: ${errText}` };
    }

    const data = await response.json() as { results?: Array<{ id: string; properties?: Record<string, unknown> }> };
    const lessons: Lesson[] = (data.results ?? []).map((page) => {
      const props = page.properties ?? {};
      const titleArr = (props["title"] as { title?: Array<{ plain_text?: string }> } | undefined)?.title ?? [];
      return {
        id: page.id,
        title: titleArr[0]?.plain_text ?? "Untitled",
        content: "",
        status: "draft" as const,
      };
    });

    return { success: true, lessons };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}