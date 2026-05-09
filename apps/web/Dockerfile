# Multi-stage build for Next.js on Fly.io
FROM node:20-slim AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy root config + lockfile
COPY package.json pnpm-lock.yaml ./

# Install all workspace dependencies (no filter — installs all apps)
RUN pnpm install --frozen-lockfile --ignore-workspace

# Copy the web app
COPY apps/web .

# Build (NODE_ENV must not be 'production' during build to get full deps)
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