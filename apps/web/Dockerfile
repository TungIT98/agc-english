# Multi-stage build for Next.js on Fly.io
FROM node:20-slim AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy root workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy web app package
COPY apps/web/package.json apps/web/

# Copy packages if present
COPY packages ./packages 2>/dev/null || true

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy and build the web app
COPY apps/web .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
RUN pnpm build

FROM node:20-slim AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=8080

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/server ./.next/server
COPY --from=builder --chown=nextjs:nodejs /app/.next/cache ./.next/cache
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]