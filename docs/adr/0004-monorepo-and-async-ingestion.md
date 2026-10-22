# Monorepo Workspace and Asynchronous Ingestion Flow

We decided to structure the codebase as a TypeScript monorepo (`apps/web`, `apps/server`, `packages/types`) with asynchronous ingestion jobs.

## Context
Parsing multi-page academic PDFs with mathematical notation and tables, followed by batch embedding into Qdrant, takes significant processing time (10–60+ seconds per paper). Synchronous HTTP upload calls would cause browser request timeouts and degraded user experience.

## Decision
The Express server accepts PDF uploads, writes them to storage, generates a unique `jobId`, and dispatches background processing while returning immediately. The Next.js client tracks the ingestion status via polling or server-sent events.
