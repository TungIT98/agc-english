# Build stage
FROM node:20-slim AS builder
WORKDIR /app

# Install just the web app deps (no pnpm workspace complexity)
COPY apps/web/package.json ./
RUN npm install --production=false && \
    mv node_modules apps_web_node_modules

# Copy source and build
COPY apps/web/ ./
RUN npm run build

# Production runtime
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/server ./.next/server
COPY --from=builder --chown=nextjs:nodejs /app/.next/cache ./.next/cache
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps_web_node_modules ./node_modules

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]