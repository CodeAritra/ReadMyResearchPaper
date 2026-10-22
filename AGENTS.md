# Agent Guidelines: Research Paper Q&A

System instructions and operational constraints for AI agents working in this repository.

## Pointers & Authorities

- **Domain Glossary**: Consult [`GLOSSARY.md`](./GLOSSARY.md) before naming types, routes, or variables. Use established terms (`Paper`, `Collection`, `Evidence Chunk`, `Attribution`, `Citation Anchor`). Never substitute informal synonyms.
- **Architecture Decisions**: Consult [`docs/adr/`](./docs/adr/) for non-negotiable architectural boundaries (LangChain.js, Qdrant Cloud, Gemini + Cohere Rerank, monorepo layout).

## Workspace Topology

This repository is a TypeScript monorepo:
- `apps/web`: Next.js (App Router, Tailwind CSS, PDF viewer, citation interactions).
- `apps/server`: Express API (LangChain tool-calling agent, Qdrant hybrid retriever, PDF ingestion worker).
- `packages/types`: Shared domain interfaces (`Paper`, `EvidenceChunk`, `Attribution`, `IngestionStatus`, `QueryRequest`).

Rules:
- Never import server-only packages (LangChain, Qdrant, Multer) into `apps/web`.
- Share domain data shapes exclusively through `packages/types`.

## UI Design Standards: Minimalist, High-Signal & shadcn/ui

Design for an academic researcher, not a generic chatbot showcase:
- **Component Architecture**: Use **shadcn/ui** patterns in `apps/web` (Radix UI primitives + Tailwind CSS). Keep components modular inside `src/components/ui/` with zero runtime CSS-in-JS overhead.
- **Frontend Design Principles**: Prioritize high signal-to-noise ratio, information density, and functional minimalism. Make layout and interactive states instantly legible.
- **Palette**: Clean monochromatic neutrals (slate/zinc/gray) with high-contrast text. Muted indigo/blue for interactive citation links. No multi-colored decorative gradients, floating sparkler icons, or AI gimmick animations.
- **Layout**: Two-pane workbench. Left pane hosts the primary document reader (PDF canvas with zoom and page navigation). Right pane hosts the collapsible discussion and attribution inspector. Fully responsive with mobile drawer fallback.
- **Typography**: Clean, readable sans-serif (Inter or system stack) with monospace for formulas, metrics, and dataset identifiers.
- **Interactive Citations**: Every claim citing a source renders as a clickable `Citation Anchor` badge (e.g. `[Paper A · p. 4]`) that smoothly scrolls and highlights the referenced page in the viewer.
- **Latency & Streaming**: Always stream model tokens to the client over Server-Sent Events (SSE) for sub-second first-token response.

## Deployment & Dockerization Rules

- **Final Milestone Containerization**: At the conclusion of feature development, the project will be fully containerized with production-ready `Dockerfile`s for `apps/server` and `apps/web`, paired with a root `docker-compose.yml` orchestrating local and cloud environment configurations.

## Document Ingestion & RAG Rules

- **Asynchronous Ingestion**: Ingestion takes multi-page PDFs through Gemini multimodal transcription, section splitting, and Qdrant indexing. It must always run as an async job returning a `jobId`.
- **Metadata Completeness**: Every `Evidence Chunk` indexed into Qdrant must contain: `paperId`, `paperTitle`, `sectionTitle`, `pageNumber`, and `chunkIndex`.
- **Strict Grounding**: The system prompt must instruct the model to answer strictly from retrieved evidence and provide direct `Attribution` links. If evidence is lacking, state that explicitly.
- **Future Search Seam**: Keep retrieval encapsulated in LangChain tool definitions (`search_uploaded_papers`) so external tools (`search_arxiv`, `search_web`) can be attached without modifying core chains.

## Code Standards & Completion Criteria

- TypeScript strict mode enabled across all packages.
- Always run `npm run typecheck` across all packages before declaring a task complete.
- Preserve all existing comments and docstrings.
