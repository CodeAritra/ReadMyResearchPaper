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
- **Layout & Drag Resizing**: Two-pane workbench with collapsible sidebar and discussion box. Draggable pane dividers must toggle `transition-none` during active drag and synchronize updates via `requestAnimationFrame` for latency-free 60fps tracking.
- **Document Viewing**: Dual view modes supported in `DocumentReader`: **Section View** (semantic section stepper and dropdown) and **Whole Document** (continuous reading canvas).
- **Academic Markdown & Math**: Always render paper extracts, tables, and AI messages using `MarkdownRenderer` with `remark-gfm` and `rehype-katex` (KaTeX styling globally imported). Never output unparsed raw text with `whitespace-pre-wrap`. Ensure GFM tables have preceding blank lines and formulas support `$$`, `$`, `\[...\]`, and `\(...\)`.
- **Interactive Citations**: Every claim citing a source renders as a clickable `Citation Anchor` badge (e.g. `[Paper A · p. 4]`) that smoothly scrolls and highlights the referenced page/section in the viewer.
- **Latency & Streaming**: Always stream model tokens to the client over Server-Sent Events (SSE) for sub-second first-token response.

## Development & Execution Workflows

- **Concurrent Execution**: Run `npm run dev` at the repository root to start both `apps/web` (port 3000) and `apps/server` (port 3001) simultaneously via `concurrently`.
- **First-Time User Walkthrough**: Onboarding guided tour is provided by `driver.js` with academic monochromatic popover themes anchored to key UI targets.
- **Seeded Manuscript**: The authentic *Attention Is All You Need* (Vaswani et al.) manuscript is pre-loaded into `apps/server/uploads/` and indexed into the retrieval service for immediate local testing.
- **Memory Synchronization**: Whenever you change any implementation, fix a bug, or adjust configuration/behavior, immediately update [`MEMORY.md`](./MEMORY.md) with the change summary and rationale.

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
- Immediately record all implementation and behavioral changes in [`MEMORY.md`](./MEMORY.md).
- Preserve all existing comments and docstrings.
