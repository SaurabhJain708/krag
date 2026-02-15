# Multi-stage Dockerfile for web app (Next.js)
# Stage 1: Builder - Install dependencies, generate Prisma, and build
# Using Debian-based image for better Prisma compatibility
FROM node:20-slim AS builder

# Install OpenSSL for Prisma (required for Prisma engines)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy entire workspace (needed for npm workspaces and monorepo structure)
# .dockerignore will exclude unnecessary files
COPY . .

# Install dependencies using npm workspaces
RUN npm ci

# Build arguments
ARG NEXT_PUBLIC_API_URL
ARG NODE_ENV=production
ARG ENCRYPTION_KEY_STORAGE
ARG DATABASE_URL
ARG BETTER_AUTH_SECRET
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG REDIS_URL

# Set environment variables for build stage
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NODE_ENV=$NODE_ENV
ENV ENCRYPTION_KEY_STORAGE=$ENCRYPTION_KEY_STORAGE
ENV DATABASE_URL=$DATABASE_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV REDIS_URL=$REDIS_URL

# Generate Prisma client (doesn't require DATABASE_URL, only for migrations)
# Generate only the Node.js client, not Python clients
RUN cd packages/database && npx prisma@5.17.0 generate --generator client || echo "Warning: Prisma generation may have failed, but continuing..."

# Build the UI package (needed for @repo/ui/styles.css)
RUN cd packages/ui && mkdir -p dist && npm run build:styles && npm run build:components

# Build the Next.js app

WORKDIR /app/apps/web
RUN npm run build

# Stage 2: Runner - Production image
# Using Debian-based image for better Prisma compatibility
FROM node:20-slim AS runner

# Install OpenSSL for Prisma (required for Prisma engines)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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
# In npm workspaces, dependencies are hoisted to root node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy workspace packages (needed for @repo/db, @repo/ui imports)
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

USER nextjs

WORKDIR /app/apps/web

# Expose the port
EXPOSE 3001

ENV PORT=3001

# Run the application using next start
CMD ["npm", "start"]
