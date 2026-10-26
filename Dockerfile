# Base image with Node.js - CHANGE TO DEBIAN
FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy Prisma schema BEFORE npm ci (needed for postinstall hook)
COPY prisma ./prisma

# Set Prisma environment to force binary engine generation
ENV PRISMA_CLI_BINARY_TARGETS="debian-openssl-3.0.x"
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Install dependencies and let postinstall hook run prisma generate
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Capture Git commit SHA and date for version display
ARG GIT_SHA=unknown
ARG GIT_DATE=unknown

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_GIT_SHA=${GIT_SHA}
ENV NEXT_PUBLIC_GIT_DATE=${GIT_DATE}

# Accept build arguments for environment variables
ARG DATABASE_URL
ARG DIRECT_URL
ARG ENCRYPTION_KEY
ARG NEXT_PUBLIC_HCAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Dummy DATABASE_URL for build-time validation (if not provided)
# This will be overridden at runtime by environment variables
ENV DATABASE_URL=${DATABASE_URL:-"postgresql://dummy:dummy@localhost:5432/dummy"}
ENV DIRECT_URL=${DIRECT_URL:-"postgresql://dummy:dummy@localhost:5432/dummy"}
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY}
ENV NEXT_PUBLIC_HCAPTCHA_SITE_KEY=${NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner

# Install PostgreSQL client for pg_dump (needed for backups)
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Accept build arguments and convert them to environment variables
ARG DATABASE_URL
ARG DIRECT_URL
ARG NEXT_PUBLIC_HCAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_URL

# Set runtime environment variables from build args
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_URL=${DIRECT_URL}
ENV NEXT_PUBLIC_HCAPTCHA_SITE_KEY=${NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy node_modules (needed for npx prisma and all dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Just start the app - migrations will be handled separately by Coolify
# DATABASE_URL will be injected at runtime by Coolify
CMD ["node", "server.js"]
