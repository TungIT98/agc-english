# AGC_English - Multi-Agent English Learning Platform

## Context

Xây dựng nền tảng học tiếng Anh tích hợp AI Agent với mô hình Multi-Agent System (MAS), tham chiếu UI từ Cofounder.co.

**Dự án hiện tại:** ✅ DEPLOYED - Tất cả tests E2E passed (9/9)

**Tech Stack được chọn:**
- **Agent SDK:** Claude Agent SDK (TypeScript) - OpenAI-compatible
- **AI Provider:** MiniMax API (MiniMax-M2.7)
- **Frontend:** Next.js 14 + TypeScript + Tailwind + shadcn/ui + React Flow
- **Backend:** Cloudflare Workers (TypeScript)
- **Database:** Cloudflare D1 (SQLite) + KV
- **Hosting:** Fly.io (Frontend) + Cloudflare Workers (API)

---

## Mục tiêu

Dashboard quản trị trực quan (dark theme, radial org chart) với 5 AI Agent chuyên biệt:
- **CSKH Agent** - Hỗ trợ, khiếu nại, refund
- **Sales Agent** - Tư vấn, chốt đơn, CRM
- **Content Agent** - Tạo nội dung học tập, marketing
- **Training Agent** - Cá nhân hóa lộ trình học
- **Branding Agent** - Đảm bảo nhất quán thương hiệu

---

## Tech Stack Chi tiết

| Layer | Technology |
|-------|------------|
| **Agent Runtime** | Claude Agent SDK (@anthropic-ai/claude-agent-sdk) |
| **AI Provider** | MiniMax API (OpenAI-compatible, model: MiniMax-M2.7) |
| **Frontend** | Next.js 14 + TypeScript |
| **UI Components** | shadcn/ui + Tailwind CSS |
| **Org Chart** | React Flow |
| **Charts** | Recharts |
| **Backend** | Cloudflare Workers (TypeScript) |
| **Database** | Cloudflare D1 (SQLite) + KV Store |
| **Auth** | Cloudflare Access |
| **Hosting** | Fly.io (Frontend) + Cloudflare Workers (API) |

---

## MiniMax Configuration

### ~/.claude/settings.json

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<MINIMAX_API_KEY>",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "ANTHROPIC_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "MiniMax-M2.7"
  }
}
```

**Lưu ý:** Xóa ANTHROPIC_AUTH_TOKEN và ANTHROPIC_BASE_URL env vars nếu có conflict.

### Verify Configuration
```bash
claude
/status    # → Should show api.minimax.io/anthropic
/model    # → Should show MiniMax-M2.7
```

---

## Claude Agent SDK - Code Examples

### 1. Basic Query
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Tạo content strategy cho khóa học tiếng Anh giao tiếp",
})) {
  if (message.type === "result") {
    console.log(message.result);
  }
}
```

### 2. Custom Tools
```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const searchStudentTool = tool(
  "search_student",
  "Tìm kiếm học viên trong database",
  { query: z.string() },
  async ({ query }) => {
    const students = await supabase
      .from('students')
      .select('*')
      .ilike('name', `%${query}%`);
    return { content: [{ type: "text", text: JSON.stringify(students.data) }] };
  },
  { annotations: { readOnlyHint: true } }
);
```

### 3. Multi-Agent
```typescript
for await (const message of query({
  prompt: "Phân tích và tạo content cho chiến dịch marketing",
  options: {
    allowedTools: ["Read", "Write", "Agent"],
    agents: {
      "cskh-agent": {
        description: "CSKH agent - xử lý khiếu nại",
        prompt: "Bạn là CSKH agent. Phân tích feedback và đề xuất.",
        tools: ["Read", "search_student"]
      },
      "content-agent": {
        description: "Content agent - viết content",
        prompt: "Bạn là content agent. Tạo content marketing.",
        tools: ["Read", "Write"]
      }
    }
  }
})) {
  if ("result" in message) console.log(message.result);
}
```

### 4. Session Management
```typescript
let sessionId: string;

for await (const message of query({
  prompt: "Đọc danh sách khóa học",
  options: { allowedTools: ["Read"] }
})) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
  }
}

// Continue context
for await (const message of query({
  prompt: "Tạo nội dung giới thiệu cho khóa đầu tiên",
  options: { resume: sessionId }
})) {
  console.log(message);
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGC_English System                          │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Frontend (Next.js on Fly.io
)                │  │
│  │  - Dashboard (dark theme, React Flow org chart)                │  │
│  │  - Sidebar navigation                                          │  │
│  │  - Real-time updates via polling/SSE                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    API Layer (Cloudflare Workers)              │  │
│  │  - Agent orchestration endpoints                               │  │
│  │  - Task queue management                                       │  │
│  │  - Budget/cost tracking                                         │  │
│  │  - Human-in-the-loop approvals                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Claude Agent SDK                            │  │
│  │                                                               │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│  │
│  │  │   CEO   │  │   CSKH  │  │  Sales  │  │ Content │  │Training││  │
│  │  │ Agent   │  │ Manager │  │ Manager │  │ Manager │  │ Manager││  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘│  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │  Tool Registry: search_student, create_task, etc.     │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              OpenAI-Compatible API                             │  │
│  │        MiniMax API (api.minimax.io/anthropic)                   │  │
│  │        Model: MiniMax-M2.7                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Cloudflare D1 + KV                           │  │
│  │  - SQLite (D1) for persistent data                             │  │
│  │  - KV for session/state management                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5 Agent Definitions

### CEO Agent (Orchestrator)
```typescript
const ceoAgent = {
  name: "CEO Agent",
  description: "Chief Executive Officer - điều phối toàn bộ hệ thống",
  prompt: `Bạn là CEO của AGC_English. Bạn điều phối 5 manager agents:
- CSKH Manager: xử lý khiếu nại, refund
- Sales Manager: tư vấn, chốt đơn
- Content Manager: tạo nội dung
- Training Manager: lộ trình học cá nhân hóa
- Branding Manager: đảm bảo nhất quán thương hiệu

Khi nhận task:
1. Phân tích và quyết định delegate
2. Giao task cho manager phù hợp
3. Tổng hợp kết quả và báo cáo`,
  tools: ["Read", "Write", "Agent"]
};
```

### CSKH Manager Agent
```typescript
const cskhAgent = {
  name: "CSKH Manager",
  description: "Customer Support Manager - xử lý khiếu nại, refund",
  prompt: `Bạn là CSKH Manager của AGC_English.
Nhiệm vụ:
- Xử lý khiếu nại khách hàng
- Quyết định refund (dưới $50 tự động, trên $50 cần CEO approve)
- Gửi thông báo qua Zalo
- Cập nhật trạng thái trong database`,
  tools: ["Read", "search_student", "update_order", "send_zalo"]
};
```

### Sales Manager Agent
```typescript
const salesAgent = {
  name: "Sales Manager",
  description: "Sales Director - tư vấn, chốt đơn, CRM",
  prompt: `Bạn là Sales Manager của AGC_English.
Nhiệm vụ:
- Tư vấn khóa học phù hợp với level học viên
- Chốt đơn và tạo hóa đơn
- Theo dõi lead qua CRM
- Đề xuất upsell/cross-sell`,
  tools: ["Read", "search_student", "create_order", "update_lead"]
};
```

### Content Manager Agent
```typescript
const contentAgent = {
  name: "Content Manager",
  description: "Content Director - tạo nội dung học tập, marketing",
  prompt: `Bạn là Content Manager của AGC_English.
Nhiệm vụ:
- Tạo nội dung bài học tiếng Anh
- Viết content marketing (blog, social media)
- Tối ưu SEO cho website
- Lên lịch content calendar`,
  tools: ["Read", "Write", "create_lesson", "publish_social"]
};
```

### Training Manager Agent
```typescript
const trainingAgent = {
  name: "Training Manager",
  description: "Training Director - cá nhân hóa lộ trình học",
  prompt: `Bạn là Training Manager của AGC_English.
Nhiệm vụ:
- Đánh giá level học viên
- Tạo lộ trình học cá nhân hóa
- Tạo bài kiểm tra đánh giá
- Theo dõi progress và điều chỉnh`,
  tools: ["Read", "create_assessment", "update_progress", "recommend_course"]
};
```

### Branding Manager Agent
```typescript
const brandingAgent = {
  name: "Branding Manager",
  description: "Brand Guardian - đảm bảo nhất quán thương hiệu",
  prompt: `Bạn là Branding Manager của AGC_English.
Nhiệm vụ:
- Review tất cả content trước khi publish
- Đảm bảo giọng văn, hình ảnh nhất quán
- Kiểm tra logo, màu sắc theo brand guidelines
- Approve/reject content`,
  tools: ["Read", "review_content", "check_brand_compliance"]
};
```

---

## API Endpoints

```
# Agent Management
POST   /api/agents/query          - Query an agent
GET    /api/agents                - List all agents
GET    /api/agents/:id            - Get agent details
POST   /api/agents/:id/pause      - Pause agent
POST   /api/agents/:id/resume     - Resume agent

# Task Management
GET    /api/tasks                 - List tasks
POST   /api/tasks                 - Create task
PATCH  /api/tasks/:id             - Update task
POST   /api/tasks/:id/checkout     - Atomic checkout

# Budget/Cost
POST   /api/costs                 - Report cost event
GET    /api/costs/summary         - Total spend
GET    /api/costs/by-agent        - Per-agent costs

# Approvals
GET    /api/approvals             - List pending approvals
POST   /api/approvals/:id/approve - Approve
POST   /api/approvals/:id/reject  - Reject
```

---

## Deployment & Connection

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Fly.io (Frontend)                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Next.js 14 App (Docker)                                    │  │
│  │  - Dashboard UI                                               │  │
│  │  - React Flow org chart                                      │  │
│  │  - shadcn/ui components (dark theme)                        │  │
│  │                                                              │  │
│  │  Region: Asia Pacific (hkg)                                  │  │
│  │  URL: https://agc-english-web.fly.dev                            │  │
│  │  Env: NEXT_PUBLIC_API_URL=https://agc-english-api.thanhtungtran364.workers.dev │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              │ HTTPS REST API                     │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Cloudflare Workers (API)                                     │  │
│  │                                                              │  │
│  │  Routes:                                                     │  │
│  │  - POST /api/agents/query      (Claude Agent SDK)           │  │
│  │  - GET  /api/agents            (list agents)                │  │
│  │  - GET  /api/tasks             (list tasks)                  │  │
│  │  - POST /api/tasks            (create task)                 │  │
│  │  - GET  /api/costs/summary    (budget summary)              │  │
│  │  - GET  /api/approvals        (pending approvals)          │  │
│  │                                                              │  │
│  │  URL: https://agc-english-api.thanhtungtran364.workers.dev                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│          ┌───────────────────┼───────────────────┐                  │
│          │                   │                   │                  │
│          ▼                   ▼                   ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │ Cloudflare   │    │  Claude      │    │  External    │         │
│  │ D1 + KV      │    │  Agent SDK   │    │  APIs        │         │
│  │              │    │              │    │              │         │
│  │ - SQLite DB  │    │  MiniMax     │    │ - Zalo API   │         │
│  │ - Sessions   │    │  API         │    │ - Notion API │         │
│  │ - Cache      │    │  (OpenAI     │    │ - CRM API    │         │
│  │              │    │   compat)     │    │              │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

### Connection Flow

```
User Browser
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Fly.io Frontend                                              │
│  fetch('https://agc-english-api.thanhtungtran364.workers.dev/api/agents')    │
└─────────────────────────────────────────────────────────────┘
    │
    │ HTTPS
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Workers                                           │
│  │                                                          │
│  ├──► D1 Database                                           │
│  │    SELECT * FROM agents WHERE company_id = 'agc-english' │
│  │                                                          │
│  ├──► KV Store                                               │
│  │    get('session:abc123') → session state                  │
│  │                                                          │
│  └──► Claude Agent SDK                                      │
│       │                                                     │
│       │ OpenAI-compatible API                               │
│       │ ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic │
│       │                                                     │
│       ▼                                                     │
│  MiniMax API (MiniMax-M2.7)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://agc-english-api.thanhtungtran364.workers.dev
```

#### Backend (wrangler.toml)
```toml
name = "agc-english-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
MINIMAX_API_URL = "https://api.minimax.io/anthropic"

[[d1_databases]]
binding = "DB"
database_name = "agc-english-db"
database_id = "your-database-id-here"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id-here"
```

#### Backend Secrets
```bash
wrangler secret put MINIMAX_API_KEY
# Enter: sk-xxx-xxx (MiniMax API key)
```

### URLs Summary

| Service | URL | Provider |
|---------|-----|----------|
| Frontend | https://agc-english.fly.dev | Fly.io |
| API | https://agc-english-api.thanhtungtran364.workers.dev | Cloudflare Workers |
| D1 Database | (managed by Cloudflare) | Cloudflare D1 |
| KV Store | (managed by Cloudflare) | Cloudflare KV |
| AI Provider | https://api.minimax.io/anthropic | MiniMax |

---

## Database Schema (Cloudflare D1)

```sql
-- Companies
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  budget_monthly_cents INTEGER DEFAULT 18000,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Agents
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'idle', -- idle, running, paused
  budget_monthly_cents INTEGER DEFAULT 2500,
  spent_monthly_cents INTEGER DEFAULT 0,
  config TEXT NOT NULL, -- JSON string
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, done, blocked
  priority INTEGER DEFAULT 0,
  assignee_agent_id TEXT REFERENCES agents(id),
  parent_task_id TEXT REFERENCES tasks(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Cost Events
CREATE TABLE cost_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id),
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_cents INTEGER,
  model TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Approvals
CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id),
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  requested_by TEXT REFERENCES agents(id),
  approved_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Note:** Cloudflare D1 uses SQLite syntax. Use `wrangler d1 execute` to run migrations.

---

## Dashboard UI

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  AGC_English                           [Search] [Settings] │
├────────┬────────────────────────────────────────────────────┤
│        │                                                     │
│ HOME   │         Radial Org Chart (React Flow)               │
│ AGENTS │                   [CEO]                             │
│ TASKS  │          CSKH  Sales  Content  Training  Brand     │
│ COSTS  │                                                     │
│ APPROVE│  ┌─────────────────────────────────────────────┐   │
│        │  │  Active: 5/5  |  Tasks: 23  |  Budget: 58%  │   │
│        │  └─────────────────────────────────────────────┘   │
└────────┴────────────────────────────────────────────────────┘
```

### Dark Theme Colors

```css
--background: #0a0a0f;
--surface: #141420;
--border: #1e1e2e;
--primary: #6366f1;
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--text-primary: #ffffff;
--text-secondary: #94a3b8;
```

### Components

1. **Sidebar** - Fixed navigation
2. **OrgChart** - React Flow radial layout
3. **AgentCard** - Status, budget, last activity
4. **TaskList** - Running/completed/pending
5. **BudgetMeter** - Progress bars per agent
6. **ApprovalQueue** - Pending human decisions

---

## Project Structure

```
e:\AGC_English\
├── apps/
│   ├── web/                          # Next.js frontend (Fly.io)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx       # Root layout with sidebar
│   │   │   │   ├── page.tsx         # Dashboard (org chart)
│   │   │   │   ├── agents/
│   │   │   │   │   └── page.tsx     # Agent management
│   │   │   │   ├── tasks/
│   │   │   │   │   └── page.tsx     # Task board
│   │   │   │   ├── costs/
│   │   │   │   │   └── page.tsx     # Budget dashboard
│   │   │   │   └── approvals/
│   │   │   │       └── page.tsx     # Human-in-the-loop
│   │   │   ├── components/
│   │   │   │   ├── ui/              # shadcn components
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── org-chart.tsx     # React Flow
│   │   │   │   ├── agent-card.tsx
│   │   │   │   ├── task-list.tsx
│   │   │   │   └── budget-meter.tsx
│   │   │   └── lib/
│   │   │       └── api.ts           # API client
│   │   ├── Dockerfile               # Fly.io deployment
│   │   ├── .env.local
│   │   └── package.json
│   │
│   └── api/                          # Cloudflare Workers
│       ├── src/
│       │   ├── index.ts             # Worker entry point
│       │   ├── routes/
│       │   │   ├── agents.ts        # Agent endpoints
│       │   │   ├── tasks.ts         # Task endpoints
│       │   │   ├── costs.ts         # Budget endpoints
│       │   │   └── approvals.ts     # Approval endpoints
│       │   ├── services/
│       │   │   ├── agent.ts         # Claude Agent SDK wrapper
│       │   │   ├── db.ts            # D1 helpers
│       │   │   └── cache.ts         # KV helpers
│       │   └── middleware/
│       │       └── cors.ts
│       ├── wrangler.toml
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── db/
│       ├── schema.sql               # D1 migrations
│       └── seed.sql                 # Initial data
│
├── .env.example
├── package.json                      # pnpm workspace
├── pnpm-workspace.yaml
├── fly.toml                          # Fly.io config
└── README.md
```

### wrangler.toml (Cloudflare Workers)

```toml
name = "agc-english-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "agc-english"
database_id = "your-d1-database-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

| Task | Description |
|------|-------------|
| 1.1 | Initialize Next.js 14 project on fly.io |
| 1.2 | Setup Tailwind CSS + shadcn/ui |
| 1.3 | Initialize Cloudflare Workers project |
| 1.4 | Create D1 database + run schema migrations |
| 1.5 | Create KV namespace for sessions |
| 1.6 | Install Claude Agent SDK in Workers |
| 1.7 | Configure MiniMax API key as secret |
| 1.8 | Create base components (sidebar, layout) |
| 1.9 | Connect frontend to API |

### Phase 2: Agent System (Week 3-4)

| Task | Description |
|------|-------------|
| 2.1 | Implement Claude Agent SDK wrapper in Workers |
| 2.2 | Define 5 agent configurations |
| 2.3 | Create tool registry (search_student, create_task, etc.) |
| 2.4 | Implement session management via KV |
| 2.5 | Build task queue with atomic checkout |
| 2.6 | Implement budget tracking per agent |

### Phase 3: Dashboard UI (Week 5-6)

| Task | Description |
|------|-------------|
| 3.1 | Build sidebar navigation |
| 3.2 | Implement React Flow org chart |
| 3.3 | Create agent cards with real-time status |
| 3.4 | Build task list view (pending/in_progress/done) |
| 3.5 | Create budget dashboard with charts |
| 3.6 | Build approval queue (human-in-the-loop) |

### Phase 4: Integrations (Week 7-8)

| Task | Description |
|------|-------------|
| 4.1 | Zalo API integration (CSKH notifications) |
| 4.2 | CRM API integration (Sales leads) |
| 4.3 | Notion API integration (Content calendar) |
| 4.4 | KV session caching optimization |

### Phase 5: Deployment (Week 9-10)

| Task | Description |
|------|-------------|
| 5.1 | Setup custom domain (api.agc-english.com) |
| 5.2 | Configure CORS for frontend |
| 5.3 | Setup Cloudflare monitoring/analytics |
| 5.4 | E2E testing + performance optimization |
| 5.5 | Production deployment |

---

## Budget Summary (Monthly)

| Agent | Budget (USD) |
|-------|-------------|
| CEO | $25 |
| CSKH Manager | $25 |
| Sales Manager | $40 |
| Content Manager | $50 |
| Training Manager | $25 |
| Branding Manager | $15 |
| **Total** | **$180/month** |

Budget thresholds:
- 80% → Soft warning
- 100% → Hard stop (agent paused)

---

## Verification

### MiniMax Configuration
```bash
# Verify Claude Code uses MiniMax
claude
/status    # → Should show api.minimax.io/anthropic
/model    # → Should show MiniMax-M2.7
```

### Project Test
```bash
# Start development
pnpm dev

# Open http://localhost:3000
# Verify:
# - Dark theme renders
# - Org chart displays
# - Agent status cards visible
```

---

## Reference

- Claude Agent SDK: https://code.claude.com/docs/en/agent-sdk/overview
- MiniMax API: https://platform.minimax.io/docs/token-plan/claude-code
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare KV: https://developers.cloudflare.com/kv/
- React Flow: https://reactflow.dev/
- shadcn/ui: https://ui.shadcn.com/

---

## Deployment Status

**Status:** ✅ DEPLOYED

### Live URLs
| Service | URL |
|---------|-----|
| Frontend | https://agc-english-web.fly.dev |
| API | https://agc-english-api.thanhtungtran364.workers.dev |

### Infrastructure
| Component | ID |
|-----------|-----|
| D1 Database | 26c159b4-c6f2-48c4-85a3-900df7992c42 |
| KV Store | 4f04ea41f38e458ba012701003411080 |

### E2E Test Results: 9/9 ✅
- ✅ API status endpoint
- ✅ API returns 6 agents from D1
- ✅ CEO agent responds via MiniMax
- ✅ Content manager generates content
- ✅ Cost tracking records API calls
- ✅ Web dashboard loads (HTTP 200)
- ✅ Web dashboard sidebar navigation
- ✅ Org chart displays on dashboard
- ✅ Memory metrics endpoint

### Agents Deployed: 6
- CEO Agent
- CSKH Manager
- Sales Manager
- Content Manager
- Training Manager
- Branding Manager

---

## Enhancement Plan (Phase 6+)

### Priority Order

| Priority | Phase | Task | Status |
|----------|-------|------|--------|
| 1 | UI | 2026 Design Upgrade (glassmorphism, micro-interactions, glow effects) | DONE ✅ |
| 2 | UI-2 | Connect existing UI to unused APIs (pause/resume buttons, forecast display) | DONE ✅ |
| 3 | K | Real-time SSE (replace 5s polling) | DONE ✅ |
| 4 | I | Activity Timeline (audit log + activity_log table) | DONE ✅ |
| 5 | F | Budget UI (top-up/transfer forms - API đã có) | DONE ✅ |
| 6 | G | Search + Filter | DONE ✅ |
| 7 | NEW-1 | Chain-of-thought visibility (agent reasoning display) | DONE ✅ |
| 8 | NEW-2 | Confidence signaling (badges on outputs) | DONE ✅ |
| 9 | NEW-3 | Agent pause/resume UI + agent registry | DONE ✅ |
| 10 | NEW-4 | Version control cho agent configs (rollback) | DONE ✅ |
| 11 | TECH | Technical debt cleanup (dead code, duplicate components) | DONE ✅ |

---

### Phase UI: 2026 Cutting-Edge Dashboard Design

**Why:** Current UI looks outdated. Upgrade to modern 2026 standards.

**Design Philosophy:** "Intelligent, alive, purposeful" - every element feels responsive and smart.

#### Color Palette (Modern Dark Tech)
```css
:root {
  /* Background - layered depth */
  --bg-base: #0a0a0c;
  --bg-elevated: #111114;
  --bg-card: #16161a;
  --bg-hover: #1c1c21;
  --bg-active: #22222b;

  /* Borders - subtle definition */
  --border-subtle: rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.1);
  --border-accent: rgba(139,92,246,0.3);

  /* Accents - vibrant but not overwhelming */
  --accent-violet: #8b5cf6;
  --accent-cyan: #22d3ee;
  --accent-emerald: #34d399;
  --accent-amber: #fbbf24;
  --accent-rose: #fb7185;

  /* Text */
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
}
```

#### Key Visual Features for 2026

**1. Glassmorphism Cards**
- Frosted glass effect with `backdrop-blur: 12px`
- Subtle gradient borders
- Soft shadow with color tint

**2. Micro-Interactions**
- Hover: scale(1.02) + glow increase
- Click: scale(0.98) + ripple effect
- Loading: skeleton shimmer animation
- Transitions: 200ms ease-out

**3. AI Activity Indicators**
- Pulsing dot when agent is "thinking"
- Streaming response animation
- Real-time status with subtle breathing effect

**4. Neon Accents**
- Glow effect on active elements: `box-shadow: 0 0 20px var(--accent-violet)`
- Gradient text on headings
- Subtle grid pattern background

**5. Bento Grid Layout**
- Dashboard uses asymmetric bento grid (like apple.com)
- Cards have different sizes based on importance
- Natural visual rhythm

**6. Command Palette (Cmd+K)**
- Quick search and actions
- Fuzzy search for agents, tasks, pages
- Keyboard-first navigation

**7. Smart Tooltips & Context Menus**
- Rich tooltips with icons
- Right-click context menus on agents/tasks
- Toast notifications for actions

**8. Live Activity Feed**
- Real-time scrolling activity
- Agent status changes animate in
- Cost increments shown as counters

**9. Gradient Orbs (Background)**
- Subtle animated gradient orbs in background
- Purple/cyan blend, very subtle
- Creates depth without distraction

**10. Advanced Org Chart**
- Nodes have glow borders
- Edges animate on hover
- Mini agent avatar inside each node
- Radial layout with depth layers

---

### Phase UI-2: Connect Unused APIs

**Why:** Many backend features exist but no UI to trigger them.

**Add:**
- Pause/Resume buttons on agent cards (API: `POST /api/agents/:id/pause`, `POST /api/agents/:id/resume`)
- Cost forecast display on costs page (API: `GET /api/costs/forecast`)
- Budget transfer/top-up forms (API đã có)

**Modified files:**
- `apps/web/src/components/agent-card.tsx` - thêm nút pause/resume
- `apps/web/src/app/costs/page.tsx` - thêm forecast chart
- `apps/web/src/app/agents/page.tsx` - thêm budget management UI

---

### Phase K: Real-time SSE

**Why:** Currently uses 5s polling. Should use SSE for instant updates.

**Add:**
- `GET /api/events/stream` - SSE endpoint in `apps/api/src/routes/events.ts`
- `useRealtime()` hook in `apps/web/src/lib/realtime.ts`
- Replace polling in AgentGrid + StatsBar with SSE subscription

**Files to add:**
- `apps/api/src/routes/events.ts`
- `apps/web/src/lib/realtime.ts`

---

### Phase I: Activity Timeline

**Why:** No audit log. Need to track who did what, when.

**Add:**
- `activity_log` table in `packages/db/schema.sql`
- `GET /api/activity` endpoint in `apps/api/src/routes/activity.ts`
- Activity feed component on dashboard

**Files to add:**
- `apps/api/src/routes/activity.ts`
- `apps/web/src/components/activity-timeline.tsx`

---

### Phase F: Budget Enhancements UI

**Why:** API endpoints exist (top-up, transfer, forecast) but no UI.

**Add:**
- Top-up budget form per agent
- Transfer budget between agents
- Monthly spend forecast chart
- Alert threshold configuration per agent

**Modified files:**
- `apps/web/src/app/costs/page.tsx` - add management UI
- `apps/web/src/app/settings/page.tsx` - add alert config

---

### Phase G: Search + Filter

**Why:** No global search, no filters on list pages.

**Add:**
- Command palette search (Cmd+K) with fuzzy search
- Filter bar on agents page (by role, status)
- Filter bar on tasks page (by status, priority, assignee)

---

### NEW-1: Chain-of-Thought Visibility

**Why:** Users can't see agent reasoning. Critical for trust in AI systems.

**Add:**
- When agent processes a task, show reasoning steps in agent detail modal
- Each step: thought → action → result
- Expandable/collapsible reasoning tree

**Files to modify:**
- `apps/web/src/components/agent-detail-modal.tsx` - add reasoning section

---

### NEW-2: Confidence Signaling

**Why:** No indicator of how confident the agent is in its outputs.

**Add:**
- Badge on agent outputs: Confident (green) / Uncertain (amber) / Low confidence (red)
- Based on budget remaining + task complexity

**Files to modify:**
- `apps/web/src/components/agent-card.tsx` - add confidence indicator

---

### NEW-3: Agent Registry + Pause/Resume UI

**Why:** No UI to pause/resume agents, no comprehensive agent inventory.

**Add:**
- Agent registry page with all agents listed
- Pause/Resume toggle per agent
- Agent metadata (created date, version, owner)
- Quarantine controls for problematic agents

**Modified files:**
- `apps/web/src/app/agents/page.tsx` - full agent management UI

---

### NEW-4: Agent Version Control

**Why:** No way to rollback agent config if something goes wrong.

**Add:**
- Agent config versioning in database
- `GET /api/agents/:id/versions` - list versions
- `POST /api/agents/:id/rollback` - rollback to version
- Version history UI in agent detail modal

**Files to add:**
- `apps/api/src/routes/agent-versions.ts`
- Update `packages/db/schema.sql` with `agent_versions` table

---

### TECH: Technical Debt Cleanup

**Why:** Code quality issues that slow down future development.

**Cleanup tasks:**
1. Xóa duplicate: `PageWrapper` vs `Layout` - chỉ giữ một
2. Xóa dead code: `MobileContext` / `useMobile()` không dùng
3. Tạo shared hooks: `useAgents()`, `useTasks()` để tránh lặp code
4. Thêm error boundaries cho pages
5. Thêm loading states skeleton cho các cards
6. Fix form validation (TaskModal, Settings)

---

### Implementation Order (Final)

1. **UI** - Design upgrade (colors, glassmorphism, animations)
2. **UI-2** - Connect unused APIs (pause/resume, forecast)
3. **TECH** - Cleanup dead code + create shared hooks
4. **K** - Real-time SSE (infrastructure)
5. **I** - Activity timeline (audit)
6. **F** - Budget management UI
7. **G** - Search + filter
8. **NEW-1** - Chain-of-thought visibility
9. **NEW-2** - Confidence signaling
10. **NEW-3** - Agent registry + pause/resume
11. **NEW-4** - Version control

---

## NEW Ideas from Competitor Research (2025-2026)

### 1. Visual Workflow Canvas

**What:** Drag-and-drop node editor để thiết kế agent workflows mà không cần code.

**Reference:** OpenAI Agent Builder, n8n, Dify đều có visual canvas.

**For AGC_English:** Thêm `/workflows` page với canvas cho phép kéo thả agents, tasks, và decision points để design multi-step workflows.

---

### 2. Multi-Agent Crew Visualization

**What:** Dashboard hiển thị các agents làm việc cùng nhau - state monitoring, delegation patterns, inter-agent communication.

**Reference:** CrewAI dashboard, Microsoft Copilot Studio.

**For AGC_English:** Thêm crew view trên dashboard showing agent-to-agent handoffs và collaboration state.

---

### 3. Session Replay / Time-Travel Debugging

**What:** Cho phép "rewind" agent execution để xem lại reasoning steps.

**Reference:** Arize AI - "session replay dashboard provides 'time-travel' capabilities to rewind an agent's execution."

**For AGC_English:** Thêm timeline-based session replay trong agent detail modal - click vào bất kỳ step nào để xem state tại thời điểm đó.

---

### 4. Natural Language Workflow Generator

**What:** User mô tả bằng plain English, system tự động tạo workflow configuration.

**Reference:** n8n AI Workflow Builder - "create workflows using natural language descriptions."

**For AGC_English:** Thêm input box: "Tôi muốn một agent tự động reply khách hàng về khóa học" → system tạo workflow với rules.

---

### 5. Autonomy Dial

**What:** Cho phép user chọn mức độ autonomous của agent: Observe & Suggest / Plan & Propose / Act with Confirmation / Act Autonomously.

**Reference:** Microsoft Copilot Studio - "autonomy dial" pattern.

**For AGC_English:** Thêm toggle per-agent: "Supervision Level" - agent có thể tự quyết định bao nhiêu trước khi cần human approval.

---

### 6. Intent Preview trước khi Agent hành động

**What:** Trước khi agent làm điều quan trọng, hiển thị "Agent sẽ làm X, Y, Z" với options: Proceed / Edit Plan / Handle it Myself.

**Reference:** Smashing Magazine - "Intent Preview" pattern targeting >85% Acceptance Rate.

**For AGC_English:** Khi agent sắp send Zalo, create approval, hoặc spend budget > threshold → show confirmation modal với preview.

---

### 7. Enterprise Agent Governance Dashboard

**What:** Centralized agent management cho organization - ai được tạo agent nào, dùng bao nhiêu budget, audit compliance.

**Reference:** Microsoft Copilot Studio - "AI admins gain visibility into agent activity, can enable or block them."

**For AGC_English:** Thêm admin panel: agent creation permissions, role-based access, audit logs per user.

---

### 8. Shared Workspace với Conflict Resolution

**What:** Multiple agents collaborate trên same files với locking mechanism.

**Reference:** Fast.io - "shared workspace where multiple AI agents collaborate on files. Prevent conflicts with locks."

**For AGC_English:** Khi multiple agents work on same task/lesson → show lock indicator ai đang edit.

---

### 9. Guided Agent Onboarding Wizard

**What:** Step-by-step wizard để tạo first agent và run first task trong <5 phút.

**Reference:** Zylos Research - "Designing the First 5 Minutes for AI Agent Products."

**For AGC_English:** Thêm "/onboarding" flow: select template → configure agent → run first task → celebrate.

---

### 10. Prescriptive Dashboard Alerts

**What:** Dashboard không chỉ hiển thị data mà còn đưa ra recommendations: "Budget sẽ hết trong 3 ngày nếu tiếp tục - nên top-up hoặc giảm usage."

**Reference:** 2026 dashboard trend - "From passive data displays to proactive decision partners."

**For AGC_English:** Thêm AI-powered insights trên dashboard: spending predictions, anomaly detection, action recommendations.

---

### Priority Order for New Ideas

| Priority | Idea | Impact | Status |
|----------|------|--------|--------|
| 1 | Intent Preview (human-in-the-loop) | Trust + safety | DONE ✅ |
| 2 | Autonomy Dial | User control | DONE ✅ |
| 3 | Session Replay / Time-Travel | Debugging | DONE ✅ |
| 4 | Visual Workflow Canvas | No-code workflow | DONE ✅ |
| 5 | Guided Onboarding | User adoption | DONE ✅ |
| 6 | Enterprise Governance | Scale | DONE ✅ |
| 7 | Command Palette (Cmd+K) | UX polish | DONE ✅ |
| 8 | Natural Language Workflow | No-code | DONE ✅ |
| 9 | Prescriptive Alerts | Proactive | DONE ✅ |
| 10 | Shared Workspace | Collaboration | DONE ✅ |

### Implementation Notes

**Intent Preview (Priority 1)** — fully implemented:
- `POST /api/agents/preview` in `apps/api/src/routes/agents.ts` — analyzes prompt for risky actions (Zalo, refunds, approvals, budget spend, student search, content creation, delegation)
- `IntentPreviewModal` component in `apps/web/src/components/intent-preview-modal.tsx` — shows steps with risk badges, Proceed / Cancel / Handle it Myself options
- `/chat` page at `apps/web/src/app/chat/page.tsx` — agent selector strip, message thread, triggers intent preview modal on sensitive prompts
- `previewAgentQuery()` and `queryAgent()` in `apps/web/src/lib/api.ts`
- CHAT nav item added to sidebar
- Live at `https://agc-english-web.fly.dev/chat`
- API deployed to `https://agc-english-api.thanhtungtran364.workers.dev`

---

## Agent Adapter Configuration (Paperclip-style)

### Adapter Types

| Adapter Type | Description |
|--------------|-------------|
| `claude_local` | Claude Code local child process với session support và skills |
| `http` | Remote agent triggered via webhook với custom payloads |
| `openclaw` | OpenClaw remote agent platform via gateway webhook |

### Agent Configuration Parameters (per adapter)

**Core Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `adapterType` | string | Adapter runtime type (claude_local, http, openclaw) |
| `adapterConfig.command` | string | Executable command (default: "claude") |
| `adapterConfig.cwd` | string | Working directory; created if missing |
| `adapterConfig.instructionsFilePath` | string | Path to markdown instructions file |
| `adapterConfig.model` | string | Model identifier (e.g., MiniMax-M2.7) |
| `adapterConfig.promptTemplate` | string | Run prompt template với variables |
| `adapterConfig.env` | object | Environment variables as KEY=VALUE |
| `adapterConfig.timeoutSec` | number | Max run duration (default: 900) |
| `adapterConfig.graceSec` | number | SIGTERM grace period before SIGKILL |
| `adapterConfig.heartbeatEnabled` | boolean | Enable heartbeat invocations |
| `adapterConfig.intervalSec` | number | Heartbeat interval (min: 30 seconds) |

**AI Provider Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `adapterConfig.effort` | string | Reasoning effort: low, medium, high |
| `adapterConfig.maxTurnsPerRun` | number | Max conversation turns (0 = unlimited) |
| `adapterConfig.chrome` | boolean | Enable Chrome browser tool |

**Budget Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `budgetMonthlyCents` | number | Monthly budget in cents |
| `budgetSoftLimitRatio` | number | Soft limit ratio (default: 0.80 = 80%) |
| `budgetHardLimitRatio` | number | Hard limit ratio (default: 1.00 = 100%) |

### Agent Definition Structure

```json
{
  "id": "string",
  "name": "string",
  "title": "string",
  "role": "string",
  "icon": "string",
  "companyId": "string",
  "reportsTo": "string | null",
  "adapterType": "claude_local | http | openclaw",
  "adapterConfig": { /* adapter-specific */ },
  "capabilities": ["delegate_task", "web_search", "write_file"],
  "desiredSkills": ["copywriting", "content-strategy"],
  "instructionsBundle": {
    "files": [{ "path": "AGENTS.md", "content": "..." }]
  },
  "runtimeConfig": {
    "heartbeatEnabled": true,
    "intervalSec": 60,
    "maxConcurrentRuns": 1
  },
  "status": "idle | running | paused",
  "budgetMonthlyCents": 2500,
  "budgetSpentCents": 0
}
```

### Agent Configuration Tabs (Cofounder-style)

Mỗi agent có 6 tabs configuration:

**1. Dashboard** - Agent overview, recent activity, status, key metrics

**2. Instructions** - Agent role definition, system prompt, behavior guidelines
- AGENTS.md content
- Task-specific instructions
- Escalation rules

**3. Skills** - Agent capabilities từ company skill library
- Available skills: search_student, create_order, send_zalo, etc.
- Custom skills
- MCP server integrations

**4. Configuration** - Adapter settings, environment variables, timeout
- Adapter type selection
- Model configuration
- Heartbeat settings
- Environment variables

**5. Runs** - Agent execution history, heartbeat logs
- Run history với timestamps
- Session IDs
- Token usage per run
- Error logs

**6. Budget** - Budget allocation, spend tracking, alerts
- Monthly budget allocation
- Current spend
- Alert threshold settings
- Budget top-up/transfer

### Budget Enforcement (Paperclip-style)

| Threshold | Behavior |
|-----------|----------|
| 80% | Soft warning - notify but continue running |
| 100% | Hard stop - agent status → `paused`, no new tasks |
| 1st of month | Budget reset, agents auto-resume |

### Environment Variables Injected into Agents

| Variable | Description |
|----------|-------------|
| `PAPERCLIP_API_KEY` | Agent API key for authenticated requests |
| `PAPERCLIP_RUN_ID` | Current heartbeat run ID |
| `PAPERCLIP_AGENT_ID` | Agent's unique identifier |
| `PAPERCLIP_COMPANY_ID` | Company the agent belongs to |
| `PAPERCLIP_TASK_ID` | Task ID if woken for a specific task |
| `PAPERCLIP_WAKE_REASON` | Why the agent was invoked |
| `PAPERCLIP_WORKSPACE_CWD` | Working directory for the agent |
| `PAPERCLIP_API_URL` | Paperclip API URL |

### Context Modes

| Mode | Behavior |
|------|----------|
| `thin` (default) | Sends only IDs; agent fetches details via API |
| `fat` | Full task details, goals, budget, comments in invocation payload |