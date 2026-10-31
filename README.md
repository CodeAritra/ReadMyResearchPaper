# Research Paper Q&A Workbench

An academic literature research workbench and retrieval-augmented generation (RAG) system engineered for deep single-paper and cross-paper comparative analysis with verifiable page-level citations.

---

## The Problem It Solves

Academic researchers, engineers, and scientists routinely read dense technical papers containing two-column text, complex mathematical proofs ($LaTeX$), nested benchmark tables, and architecture diagrams.

Generic chatbots and naive RAG pipelines fail in academic literature workflows because:
1. **Mangled Layouts & Formulas**: Blind text splitters break two-column layouts, split mathematical formulas in half, and mangle benchmark tables into unintelligible fragments.
2. **Context Drift & Acronym Loss**: Dense vector search alone frequently misses exact technical acronyms, baseline figures, hyperparameter ratios, and dataset identifiers.
3. **Unverifiable Grounding (Hallucination)**: Typical LLM responses lack page-level provenance. Researchers cannot trace claims back to the exact passage without manually skimming the original PDF.
4. **Context Starvation in Comparative Reviews**: Multi-paper queries in naive RAG systems often retrieve chunks exclusively from a single dense or lengthy paper, starving other papers of representation.

---

## Solution: High-Signal Academic Workbench

**Research Paper Q&A** provides a minimalist, high-signal research environment featuring:
- **Multimodal Document Extraction**: Converts PDF manuscripts into clean Markdown with LaTeX math syntax and structured tables preserved.
- **Strict Grounding & Interactive Citation Anchors**: Every factual claim is backed by a clickable citation badge (e.g. `[Attention Is All You Need · p. 4]`) that jumps the document canvas to the exact page.
- **Partitioned Cross-Paper Retrieval**: Balances evidence chunks evenly across all manuscripts in a user-curated Collection, preventing single-paper dominance.
- **Agentic Query Routing**: A LangChain tool-calling engine that automatically routes questions between local manuscript collections, arXiv preprints, and external web literature.

---

## Key Features

- **Split-Screen Academic Workbench**: Responsive two-pane layout featuring a document reader on the left and a streaming discussion pane with citation inspector on the right.
- **Multimodal Ingestion Pipeline**: Asynchronous background ingestion (`/api/papers/upload`) returning live progress stages (`parsing`, `extracting`, `indexing`) without blocking the user.
- **Formula & Table Preservation**: Multi-column text and LaTeX proofs (e.g., $\text{Attention}(Q, K, V)$) remain intact and rendered.
- **Hybrid Retrieval & Reranking**: Combines keyword matching (BM25 term frequencies + section header boosts) with dense vector representations, backed by Qdrant and Cohere Rerank v3.
- **Collection Workspaces**: Curate named workspaces containing multiple uploaded papers for comparative literature reviews.
- **Partitioned Multi-Paper Retrieval**: Queries each targeted paper independently to ensure balanced representation in the model's context window.
- **Interactive Citation Anchors**: Clickable badges in the chat response scroll the document reader to the exact page and section, dynamically switching documents when navigating cross-paper citations.
- **Agentic Search Seam**: LangChain tool-calling architecture encapsulating local collection search (`search_uploaded_papers`) alongside external search seams (`search_arxiv`, `search_web`) with visual source provenance tags.
- **Strict Refusal Policy**: Explicit refusal to fabricate answers when retrieved context lacks sufficient evidence, eliminating hallucinations.
- **Real-Time SSE Streaming**: Low first-token latency streaming tokens and source attributions over Server-Sent Events.

---

## Architecture & Monorepo Topology

```
research-paper-qna/
├── apps/
│   ├── web/                 # Next.js 14 (App Router, Tailwind CSS, shadcn/ui, PDF reader)
│   └── server/              # Express API (LangChain agent, Qdrant client, async ingestion)
├── packages/
│   └── types/               # Shared canonical TypeScript domain definitions
├── docs/
│   ├── adr/                 # Architecture Decision Records
│   └── specs/               # Product specifications & requirements
├── docker-compose.yml       # Production multi-service orchestration
└── package.json             # Root workspace scripts & dev tooling
```

---

## Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router) | High-performance React application with standalone Docker output |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/) | Minimalist, monochromatic academic design with zero runtime overhead |
| **Backend API** | [Express](https://expressjs.com/) (Node.js 20, TypeScript) | RESTful API, asynchronous ingestion worker, SSE streaming |
| **RAG Orchestration**| [LangChain.js](https://js.langchain.com/) | Tool-calling agent, retrieval abstraction, structured tools |
| **LLM & Multimodal**| [Google Gemini 2.0 Flash](https://aistudio.google.com/) | Multimodal document parsing, LaTeX extraction, grounded synthesis |
| **Vector Database** | [Qdrant Cloud](https://qdrant.tech/) | Sparse + dense hybrid indexing with Reciprocal Rank Fusion |
| **Reranking** | [Cohere Rerank v3](https://cohere.com/rerank) | Cross-encoder contextual re-ranking of retrieved evidence chunks |
| **Testing** | [Vitest](https://vitest.dev/) & [Supertest](https://github.com/ladjs/supertest) | Fast unit and integration tests across monorepo packages |
| **Containerization**| [Docker](https://www.docker.com/) & Docker Compose | Multi-stage production container builds |

---

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm (v10+)
- *(Optional)* Docker & Docker Compose

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Add your API credentials to `.env`:
```ini
# Google Gemini API Key (Required for live multimodal extraction & LLM synthesis)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Cohere Rerank v3 & Qdrant Cloud (fallback to in-memory retriever if empty)
COHERE_API_KEY=
QDRANT_URL=
QDRANT_API_KEY=

# Server & Client Ports
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> [!NOTE]
> The system includes built-in offline fallbacks (deterministic grounded synthesizer and in-memory hybrid retriever) so the test suite and local environment run out-of-the-box even without third-party API keys.

---

### 2. Run Locally with npm

Install dependencies and build the shared packages:
```bash
npm install
npm run build --workspace=@research-qna/types
```

Start both the backend server and frontend web app concurrently:
```bash
npm run dev
```

- **Web Workbench**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:3001](http://localhost:3001)

*(Alternatively, run services individually via `npm run dev:server` and `npm run dev:web`)*.

---

### 3. Run with Docker Compose

To build and run the containerized stack:
```bash
docker compose up --build
```

Access the workbench at [http://localhost:3000](http://localhost:3000).

---

## Testing & Quality Assurance

All features are developed strictly adhering to Test-Driven Development (TDD).

Run all 29 unit and integration test suites:
```bash
npm test
```

Run TypeScript strict mode type checks across all workspaces:
```bash
npm run typecheck
```

Build standalone production bundles:
```bash
npm run build
```

---

## License

MIT
