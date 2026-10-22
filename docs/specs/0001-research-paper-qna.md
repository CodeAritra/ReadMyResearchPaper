# Spec 0001: Research Paper Q&A Workbench

## Problem Statement

Academic researchers, engineers, and scientists routinely read dense, multi-page technical papers containing two-column text, complex mathematical formulas ($LaTeX$), nested tables, and methodology diagrams. 

Existing generic chat tools and naive RAG implementations frequently fail in academic literature workflows because:
1. Blind text splitters mangle multi-column layouts, break formulas in half, and discard table alignments.
2. Retrieved context drifts because dense vector search alone misses exact technical acronyms, baseline numbers, or dataset identifiers.
3. Model responses lack verifiable grounding—researchers cannot easily trace claims back to the exact page, section, or excerpt in the source document without manually skimming the original PDF.
4. Comparative analysis across multiple papers in a literature review is unbalanced, with longer or denser papers overwhelming search results.

## Solution

A high-signal, minimalist research workbench that enables users to curate Collections of academic Papers, perform structure-aware ingestion with formula and table preservation, and conduct deep single-paper and comparative cross-paper Q&A. 

The system features:
- Asynchronous ingestion utilizing multimodal document parsing to transcribe PDF pages into structured Markdown with LaTeX formulas and markdown tables intact.
- Hybrid retrieval (sparse BM25 + dense vector embeddings) backed by Qdrant Cloud and re-ranked with Cohere Rerank v3.
- An interactive two-pane web workbench featuring a native PDF viewer side-by-side with a streaming discussion pane.
- Clickable Citation Anchors embedded in responses that smoothly jump the PDF reader to the referenced page and highlight the underlying Evidence Chunk.
- A tool-calling retrieval architecture that isolates local collection search behind a swappable interface seam, laying the foundation for future external arXiv and web search tools.

## User Stories

1. As an academic researcher, I want to create and name a Collection, so that I can group related research papers for a specific literature review or project.
2. As an academic researcher, I want to upload multi-page PDF papers into a Collection, so that they are indexed for question answering.
3. As an academic researcher, I want ingestion to run asynchronously and report live progress stages (such as uploading, parsing, extracting structure, embedding), so that I am never blocked by long-running extraction jobs.
4. As an academic researcher, I want mathematical formulas ($LaTeX$) and multi-column layouts to be extracted faithfully into Markdown, so that mathematical proofs and equation variables are not corrupted during chunking.
5. As an academic researcher, I want tables in papers to be extracted as structured Markdown tables, so that numeric benchmark comparisons remain tabular and readable.
6. As an academic researcher, I want papers to be segmented along structural section boundaries (Abstract, Introduction, Methodology, Results), so that retrieved chunks maintain their semantic context.
7. As an academic researcher, I want every indexed Evidence Chunk to preserve its page number, section title, and paper metadata, so that any retrieved chunk has complete provenance.
8. As an academic researcher, I want to query a single paper for specific technical details (such as hyperparameter choices or dataset split ratios), so that I can quickly extract precise details without reading the entire PDF.
9. As an academic researcher, I want the retrieval system to combine exact keyword matching (BM25) with semantic embeddings, so that exact dataset acronyms and model names are retrieved reliably.
10. As an academic researcher, I want candidate retrieval chunks to be re-ordered by a cross-encoder reranker, so that only the most contextually relevant chunks enter the model's prompt.
11. As an academic researcher, I want to ask comparative questions across multiple papers in a Collection (e.g., comparing baseline accuracies between Paper A and Paper B), so that I can synthesize findings across literature.
12. As an academic researcher, I want multi-paper queries to retrieve balanced evidence chunks per paper, so that one lengthy paper does not starve another paper of representation in the answer.
13. As an academic researcher, I want responses to stream tokens in real time, so that I experience minimal first-token latency while reading long technical answers.
14. As an academic researcher, I want every factual claim in a generated answer to include an inline clickable Citation Anchor (e.g. `[Attention Is All You Need · p. 4]`), so that I can independently verify the source material.
15. As an academic researcher, I want clicking a Citation Anchor to immediately jump the PDF viewer to that exact page, so that I can read the claim in its original visual context.
16. As an academic researcher, I want the system to explicitly refuse to fabricate an answer when retrieved evidence is insufficient, so that I never receive hallucinated citations or claims.
17. As an academic researcher, I want the web interface to display a side-by-side view (document reader on the left, chat on the right), so that I do not need to switch browser tabs between my PDF and the conversation.
18. As an academic researcher, I want a clean, monochromatic neutral interface free of decorative gradients or animated gimmicks, so that I can focus entirely on high-density technical analysis.
19. As an academic researcher, I want the workspace to be fully responsive with collapsible sidebars and drawers, so that I can read papers comfortably on both desktop monitors and portable laptops.
20. As a software developer, I want the retrieval layer to be structured as a LangChain tool-calling agent, so that external search tools (such as arXiv search and web search) can be attached in the future without modifying core synthesis chains.

## Implementation Decisions

### Domain Model Adherence
The system strictly implements the canonical domain concepts defined in `GLOSSARY.md`:
- `Paper`: An individual academic manuscript in PDF format.
- `Collection`: A user-curated grouping of Papers queried together.
- `Section`: A structural division of a Paper (Abstract, Methodology, etc.).
- `Evidence Chunk`: A discrete passage or table retaining provenance metadata (`paperId`, `paperTitle`, `sectionTitle`, `pageNumber`, `chunkIndex`).
- `Attribution`: A verifiable citation embedded in the answer pointing to an Evidence Chunk.
- `Citation Anchor`: An interactive, clickable reference tag in the UI response.
- `Retriever`: Pluggable evidence fetcher component.
- `Partitioned Retrieval`: Multi-paper retrieval strategy balancing chunks across papers.

### Architecture & Monorepo Topology
- The repository is organized as a TypeScript monorepo with three root workspaces:
  - `apps/web`: Next.js (App Router, Tailwind CSS, PDF viewer, streaming chat client).
  - `apps/server`: Express API (LangChain agent, Qdrant client, asynchronous ingestion worker).
  - `packages/types`: Shared domain interfaces consumed by both client and server.
- The web frontend and Express backend communicate over REST for metadata/ingestion and Server-Sent Events (SSE) for streaming response generation.
- Client state is stateless from the server's perspective: the frontend maintains conversation message arrays and delivers the active history to the backend with each query.

### Multimodal Ingestion Pipeline
- Document uploads are handled by Express asynchronously, writing raw files to disk storage and returning an immediate `jobId`.
- Ingestion executes page-by-page transcription using Google Gemini multimodal vision, converting academic layouts into clean Markdown with LaTeX math syntax and structured tables intact.
- A section-boundary text splitter divides markdown by structural headers into ~500–800 token chunks with 100-token overlap, attaching complete provenance metadata to each chunk.

### Hybrid Retrieval & Reranking Architecture
- High-dimensional dense vectors are generated using Google `text-embedding-004`.
- Sparse keyword vectors and dense vectors are indexed into Qdrant Cloud collections supporting reciprocal rank fusion (RRF).
- Initial retrieval candidates are passed through Cohere Rerank v3 (`@langchain/cohere` inside a `ContextualCompressionRetriever`) to select the top ~5 most relevant Evidence Chunks.
- Comparative queries across multiple papers execute partitioned retrieval to query each targeted paper independently before merging evidence.

### Agentic Tool-Calling Seam
- The LangChain reasoning engine is constructed as a tool-calling agent.
- A `search_uploaded_papers` tool encapsulates Qdrant hybrid retrieval and Cohere reranking.
- Modular tool interfaces are reserved for future external literature providers (`search_arxiv` and `search_web`), allowing the model to route queries between local collection evidence and external academic indices.

### Minimalist Academic UI
- Clean monochromatic neutral palette (slate/zinc/gray) with high-contrast text and muted interactive citation badges.
- Split-screen workbench: Left pane hosts the primary document reader (PDF canvas with zoom and page jumping); Right pane hosts the collapsible discussion and attribution inspector.

## Testing Decisions

### What Makes a Good Test
Tests in this codebase must test **observable external behavior** at system boundaries, not internal implementation mechanics, private helper methods, or transient framework abstractions. A test should survive internal refactoring of LangChain runnables or Qdrant client methods as long as the inputs and outputs at the API boundary remain consistent.

### Testing Seams (Highest-Point Seam)
We propose testing the system at two primary seams:

1. **Server Ingestion & Retrieval API Boundary (Highest Backend Seam)**:
   - An integration test suite using Supertest against the Express application.
   - **Ingestion Test**: Submits a sample multi-page academic PDF fixture to `/api/papers/upload`, polls the `/api/jobs/:jobId` endpoint until status reaches `completed`, and verifies that the paper metadata and evidence chunks are correctly indexed.
   - **Query & Attribution Test**: Submits a query payload to `/api/chat` against indexed fixtures, consumes the response stream, and validates that the output includes verifiable `Attribution` metadata containing valid `paperId`, `pageNumber`, and `sectionTitle`.

2. **UI Document Interaction Seam (Highest Frontend Seam)**:
   - Component/E2E test validating the interaction between the discussion pane and the PDF viewer:
   - When a message contains a `Citation Anchor` badge, clicking the badge triggers the PDF viewer state to navigate to the exact designated page number.

### Prior Art
As this is a greenfield project, these test suites establish the foundational test patterns for the monorepo.

## Out of Scope

- User authentication, OAuth, multi-tenant billing, and subscription management.
- Live public web crawlers or automated recurring arXiv scrapers (the agent tool seam is defined, but actual live external API keys and web scraping crawlers are deferred to future milestones).
- Collaborative multi-user shared annotations or real-time concurrent document editing.
- Local on-device GPU inference (all heavy parsing, embedding, reranking, and generation leverage cloud APIs).

## Further Notes

- Ingestion status updates will be exposed via a lightweight status endpoint (`GET /api/jobs/:jobId`) to allow polling or SSE notification from the Next.js frontend.
- API keys required for development: `GEMINI_API_KEY`, `COHERE_API_KEY`, `QDRANT_URL`, and `QDRANT_API_KEY`.
