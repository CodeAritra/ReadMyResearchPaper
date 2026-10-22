# LangChain.js for RAG Orchestration

We decided to use LangChain.js as the core RAG orchestration framework across our Express TypeScript backend. This choice provides standardized abstractions for document loaders, text splitters, prompt templates, vector store integrations (Qdrant), and conversational retrieval chains.

## Considered Options
- **Vercel AI SDK + Custom Services**: Lighter weight and minimal abstractions, but requires writing bespoke chain orchestration, history management, and retrieval piping from scratch.
- **LangChain.js**: Chosen. Offers battle-tested prebuilt retrieval chains, unified vector store connectors, and standard abstractions for chaining LLM calls and output parsing.
