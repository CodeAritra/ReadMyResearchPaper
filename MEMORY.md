# Project Memory: Research Paper Q&A

This file tracks the persistent project state, architectural decisions, environment configuration, and a running ledger of all implementation changes. AI agents must update this memory immediately whenever making any implementation changes.

---

## 1. System Topology & Infrastructure

- **Monorepo Structure**:
  - `apps/web`: Next.js 14 App Router (Tailwind CSS, shadcn/ui patterns, KaTeX math formatting, PDF viewer).
  - `apps/server`: Express 4 API (LangChain tool-calling agent, Qdrant Cloud vector search, Gemini embeddings, async PDF ingestion worker).
  - `packages/types`: Shared domain interfaces (`Paper`, `EvidenceChunk`, `Attribution`, `IngestionStatus`, `QueryRequest`).
- **Vector Database**:
  - Provider: **Qdrant Cloud** (`https://8ef23d4a-50f0-4530-addf-5fd970e3089c.us-east-2-0.aws.cloud.qdrant.io`).
  - Unified Collection: `research_paper_chunks` (3072 dimensions, Cosine distance matching `gemini-embedding-001`).
  - Storage Model: Single collection partitioned by `paperId` in point payload (`paperId`, `paperTitle`, `sectionTitle`, `pageNumber`, `chunkIndex`, `content`).
- **Embedding & LLM Models**:
  - Embeddings: `gemini-embedding-001` (3072 dims) via `@langchain/google-genai`.
  - Chat Synthesis: Google Gemini `gemini-2.5-flash` with fallback to `gemini-2.0-flash`.
  - Reranker: Cohere Rerank v3 (`rerank-english-v3.0`).

---

## 2. Ingestion & Document Viewing Architecture

- **PDF Ingestion Flow**:
  1. Client sends PDF via `POST /api/papers/upload`.
  2. Server responds immediately with `{ jobId, paperId }` (`202 Accepted`).
  3. Worker executes asynchronous extraction (`pdf-parse` v2).
  4. Paper metadata and sections saved in memory store.
  5. Text chunked semantically by sections (`chunkPaperBySections`, max 2,000 chars per chunk).
  6. Embeddings generated in batches and upserted into Qdrant Cloud `research_paper_chunks`.
  7. Client polls `GET /api/jobs/:jobId` until `status: 'completed'`.
- **Authentic PDF Viewer**:
  - Served via `GET /api/papers/:paperId/pdf`.
  - Displayed in frontend `DocumentReader` using a clean `<iframe>` viewing canvas.
  - Supports deep-linking directly to referenced pages via `#page=X`.

---

## 3. Environment & Configuration Rules

- **Multi-Path `.env` Resolution**:
  - Because `npm run dev:server` runs with working directory `apps/server/`, `.env` must be present at both `D:\research qna\.env` and `D:\research qna\apps\server\.env`.
  - `apps/server/src/index.ts` automatically attempts multi-path loading (`process.cwd()`, `../.env`, `../../../.env`).
- **Cluster Diagnostics**:
  - CLI: `npm run qdrant:stats` (runs `apps/server/scripts/check-qdrant.js`).
  - Clear/Reset CLI: `npm run qdrant:clear` (runs `apps/server/scripts/clear-except-attention.js`).
  - HTTP API: `GET /api/qdrant/stats` returns total points, total distinct papers, and chunk breakdown.

---

## 4. Implementation Change Ledger

### [2026-10-31] Created Selective Qdrant Clear Script (`npm run qdrant:clear`)
- **Requirement**: Allow clearing all indexed documents and points from Qdrant Cloud and disk while strictly preserving the canonical "Attention Is All You Need" (`paper-attention`) manuscript.
- **Implementation**: Created [`apps/server/scripts/clear-except-attention.js`](file:///D:/research%20qna/apps/server/scripts/clear-except-attention.js) and wired `"qdrant:clear"` in root [`package.json`](file:///D:/research%20qna/package.json). The script scrolls points, deletes all points not matching `paper-attention` or "Attention Is All You Need" in batches, and deletes temporary uploaded PDFs from `apps/server/uploads` while keeping `attention-is-all-you-need.pdf`.
- **Live Run**: Successfully purged 46 points from other papers, leaving exactly 16 chunks for "Attention Is All You Need" in Qdrant Cloud.

### [2026-10-31] Implemented Two-Tier PDF Deduplication & Deterministic Qdrant IDs
- **Issue**: Uploading the same PDF more than once re-extracted, re-chunked, made redundant Gemini embedding API calls, and created duplicate points in Qdrant Cloud.
- **Root Cause**: The upload endpoint generated random `paperId` UUIDs on every upload without inspecting file hash or paper title, and `retrievalService` assigned `crypto.randomUUID()` to vector points in Qdrant instead of deterministic chunk IDs.
- **Fix**:
  1. **Tier 1 (Instant Byte Fingerprint)**: Added SHA-256 file hashing on upload in [`apps/server/src/app.ts`](file:///D:/research%20qna/apps/server/src/app.ts). If `paperStore.findByHash()` matches an already uploaded paper, the temporary file is unlinked and the existing paper/job is immediately returned (`duplicate: true`) without re-extraction or re-embedding.
  2. **Tier 2 (Extracted Title Deduplication)**: In the background worker, if the extracted paper title matches `paperStore.findByTitle()`, the duplicate upload file is discarded and the existing paper ID is linked.
  3. **Deterministic Point IDs & Prior Cleanup**: Updated [`apps/server/src/services/retrieval.ts`](file:///D:/research%20qna/apps/server/src/services/retrieval.ts) to generate deterministic RFC 4122 point UUIDs (`${paperId}:${chunkIndex}`) and purge old points for that paper before upserting.
  4. **Qdrant Payload Indexes**: Ensured keyword payload indexes on `paperId` and `paperTitle` for fast filtering and deduplication.
  5. **Verification**: Added automated test in `apps/server/src/ingestion.test.ts` verifying duplicate upload detection and checked `npm run qdrant:stats`.

### [2026-10-31] Memory Rule Added & Documented
- Added Memory Synchronization requirement to `AGENTS.md` under Development Workflows and Code Standards.
- Created `MEMORY.md` to persist project architecture, environment setup, and change history.

### [2026-10-31] Fixed Qdrant Cloud Ingestion on Upload
- **Issue**: Newly uploaded PDFs were not being indexed into Qdrant Cloud; only local memory was updated.
- **Root Cause**: When starting via `npm run dev`, working directory was `apps/server/`, which lacked a `.env` file. `process.env.QDRANT_URL` was `undefined` inside the running server process, causing `retrievalService` to fall back to in-memory mode.
- **Fix**: Copied `.env` to `apps/server/.env`, updated `apps/server/src/index.ts` to resolve multi-path dotenv, and verified live indexing of uploaded PDFs into Qdrant Cloud `research_paper_chunks`.

### [2026-10-31] Added Qdrant Stats Inspection Tools
- Created `apps/server/scripts/check-qdrant.js` and added root npm script `npm run qdrant:stats`.
- Added `GET /api/qdrant/stats` endpoint in `apps/server/src/app.ts` using `retrievalService.getStats()`.

### [2026-10-31] Switched Document View to Direct PDF Display
- **Issue**: PDF was parsed into raw Markdown in the viewer, losing authentic layout and math.
- **Fix**: Added `GET /api/papers/:paperId/pdf` endpoint streaming PDF file bytes. Updated `apps/web/src/components/DocumentReader.tsx` to render the authentic PDF in an `iframe` with page navigation. Removed "Choose section" and "page no" selectors from viewer header per user request.

### [2026-10-31] Fixed PDF Extraction & Page Count Calculation
- **Issue**: Uploaded PDFs were mistakenly reporting 2 pages regardless of actual length, and chat window showed demo paper welcome message.
- **Fix**: Upgraded extraction engine using `pdf-parse` v2 (`PDFParse.create()`, `parser.getInfo()`, `parser.destroy()`) to extract full text and accurate page counts across all pages. Adjusted chat welcome message to dynamically reflect the selected paper.

### [2026-11-01] Formalized Evaluations and Observability Architecture
- **Decisions & ADR**: Created `docs/adr/0009-evals-and-observability-strategy.md` following `/grill-with-docs` session.
- **Observability**: Pure LangSmith Cloud tracing (`LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY`) with project isolation between user queries (`research-paper-qna`) and evaluation benchmarks (`research-paper-qna-evals`).
- **Evaluations**: Native TypeScript LLM-as-a-judge evaluation harness using Gemini 2.5 Flash with structured Zod rubrics measuring the Extended Academic Triad (Context Relevance, Faithfulness, Answer Relevance, and Citation Precision).
- **Domain Modeling**: Registered terms `Evaluation Suite`, `Faithfulness`, `Citation Precision`, and `Execution Trace` in `GLOSSARY.md`.

### [2026-11-01] Ticket 08: Implemented Pure LangSmith Cloud Tracing & Project Isolation
- **Observability Service**: Created `apps/server/src/services/observability.ts` providing `getTracingStatus()`, `initializeTracing()`, and `withEvalProject()`.
- **API Status Endpoint**: Added `GET /api/observability/status` in `apps/server/src/app.ts` to inspect active LangSmith project and enablement.
- **Project Isolation**: Configured `research-paper-qna` as default live query stream and `research-paper-qna-evals` as isolated benchmark project.
- **Verification**: Verified with vitest in `apps/server/src/observability.test.ts` and `npm run typecheck`.

### [2026-11-01] Ticket 09: Created Seeded Manuscript Golden Evaluation Dataset
- **Golden Evaluation Dataset**: Created `apps/server/evals/datasets/attention-golden.json` covering multi-head attention dimensions, Table 2 BLEU scores, scaled dot-product formula, positional encodings, and negative abstention query.
- **Shared Types**: Added `ExpectedCitation`, `GoldenTestCase`, `EvalFocusMetric`, `MetricCritique`, and `EvaluationResult` to `packages/types`.
- **Verification**: Added `apps/server/src/dataset.test.ts` ensuring schema conformity and assertions validity.
