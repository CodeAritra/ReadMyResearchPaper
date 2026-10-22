# Next.js and Express with TypeScript for Full-Stack Architecture

We decided to build the research paper Q&A system using Next.js (frontend) and Express with TypeScript (API/services), backed by Qdrant Cloud. While Python is the conventional default for data science RAG pipelines, TypeScript across both client and server provides superior developer ergonomics, seamless streaming UI primitives, and rapid iteration for interactive academic PDF workflows.

## Considered Options
- **Pure Python (FastAPI + Streamlit/Chainlit)**: Standard for RAG prototypes, but restrictive for building customized, production-grade PDF citation UI and interactive side-by-side paper viewers.
- **Next.js + Express (TypeScript)**: Chosen. High developer velocity, rich React UI ecosystem, robust streaming (SSE/WebSockets), and native async event processing.
