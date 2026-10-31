# Stage 1: Build Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/

# Install dependencies across workspaces
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY packages/types/ ./packages/types/
COPY apps/web/ ./apps/web/

# Build shared types and Next.js standalone application
RUN npm run build --workspace=@research-qna/types
RUN npm run build --workspace=@research-qna/web

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy Next.js standalone output and public assets
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Expose Next.js port
EXPOSE 3000

# Start Next.js standalone server
CMD ["node", "apps/web/server.js"]
