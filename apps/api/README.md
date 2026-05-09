# AGC_English API — Cloudflare Workers

## Setup

### 1. Install dependencies

```bash
cd apps/api
npm install
```

### 2. Configure MINIMAX_API_KEY secret

```bash
cd apps/api
npx wrangler secret put MINIMAX_API_KEY
# Enter: sk-cp-JKcLn8JXdkygpTgwCS72isp9Zz7AswQeFdh5uKnvk0vngQHaLa6NVBOwSZ8v6xZybbPM3ck-L1UmOYff7EsliddMUK4Hk-za3N0-wUWse_Nsj--6J_n9XPw
```

### 3. Create D1 database

```bash
npx wrangler d1 create agc-english
# Replace database_id in wrangler.toml with the returned ID
```

### 4. Run migrations

```bash
npx wrangler d1 execute agc-english --file=packages/db/schema.sql
npx wrangler d1 execute agc-english --file=packages/db/seed.sql
```

### 5. Create KV namespace (sessions)

```bash
npx wrangler kv:namespace create CACHE
# Replace id in wrangler.toml with the returned ID
```

### 6. Deploy

```bash
npm run deploy
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/agents | List agents |
| GET | /api/agents/:id | Get agent |
| POST | /api/agents/query | Query agent via Claude SDK |
| POST | /api/agents/:id/pause | Pause agent |
| POST | /api/agents/:id/resume | Resume agent |
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| PATCH | /api/tasks/:id | Update task |
| POST | /api/tasks/:id/checkout | Atomic checkout |
| GET | /api/costs/summary | Budget summary |
| GET | /api/costs/by-agent | Per-agent costs |
| GET | /api/approvals | List pending approvals |
| POST | /api/approvals/:id/approve | Approve |
| POST | /api/approvals/:id/reject | Reject |
