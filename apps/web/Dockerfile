# Multi-stage Dockerfile for web app (Next.js)
# Stage 1: Builder - Install dependencies, generate Prisma, and build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy entire workspace (needed for npm workspaces and monorepo structure)
# .dockerignore will exclude unnecessary files
COPY . .

# Install dependencies using npm workspaces
RUN npm ci

# Generate Prisma client (doesn't require DATABASE_URL, only for migrations)
# Generate only the Node.js client, not Python clients
RUN cd packages/database && npx prisma@5.17.0 generate --generator client || echo "Warning: Prisma generation may have failed, but continuing..."

# Build the Next.js app
# Note: Build-time env vars should be provided via --build-arg
WORKDIR /app/apps/web
RUN npm run build

# Stage 2: Runner - Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the built app and necessary files
# Copy .next folder (contains the built Next.js app)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.ts ./apps/web/next.config.ts

# Copy node_modules (needed for runtime)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules ./apps/web/node_modules

# Copy workspace packages (needed for @repo/db, @repo/ui imports)
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

USER nextjs

WORKDIR /app/apps/web

# Expose the port
EXPOSE 3001

ENV PORT=3001

# Run the application using next start
CMD ["npm", "start"]
