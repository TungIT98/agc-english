# AGC_English - Multi-Agent English Learning Platform

## Project Status

**Implementation Started** - Phase 1 Foundation

## Quick Start

```bash
# Install dependencies
pnpm install

# Start frontend
cd apps/web && pnpm dev

# Start API (requires Cloudflare credentials)
cd apps/api && pnpm dev

# Run migrations
cd packages/db && pnpm migrate
```

## Project Structure

```
AGC_English/
├── apps/
│   ├── web/           # Next.js 14 frontend
│   │   └── src/
│   │       ├── app/           # App router pages
│   │       ├── components/    # UI components
│   │       └── lib/           # API client, utils
│   │
│   └── api/           # Cloudflare Workers backend
│       └── src/
│           ├── routes/        # API endpoints
│           ├── services/      # Business logic
│           └── middleware/    # CORS, etc.
│
├── packages/
│   └── db/             # Database schema & migrations
│
├── package.json       # pnpm workspace root
├── pnpm-workspace.yaml
└── PLAN.md            # Full project plan
```

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui, React Flow
- **Backend:** Cloudflare Workers, Hono
- **Database:** Cloudflare D1 (SQLite)
- **AI:** Claude Agent SDK + MiniMax API

## Environment Setup

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://api.agc-english.workers.dev
```

### Backend (wrangler.toml)
- Configure D1 database binding
- Configure KV namespace for sessions
- Set MINIMAX_API_KEY secret

## Agent System

6 specialized agents:
1. **CEO Agent** - Orchestrator, coordinates all managers
2. **CSKH Manager** - Customer support, complaints, refunds
3. **Sales Manager** - Consulting, closing deals, CRM
4. **Content Manager** - Learning content, marketing
5. **Training Manager** - Personalized learning paths
6. **Branding Manager** - Brand consistency, content review