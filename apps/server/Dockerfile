# Stage 1: Build & compile typescript monorepo
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/server/package.json ./apps/server/

# Install dependencies across workspaces
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY packages/types/ ./packages/types/
COPY apps/server/ ./apps/server/

# Build shared types and server
RUN npm run build --workspace=@research-qna/types
RUN npm run build --workspace=@research-qna/server

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy compiled files and required node_modules
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Expose server port
EXPOSE 3001

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# Start production server
CMD ["node", "apps/server/dist/index.js"]
