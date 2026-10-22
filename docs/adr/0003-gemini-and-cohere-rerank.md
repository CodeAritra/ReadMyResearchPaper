# Gemini LLM and Cohere Rerank Integration

We selected Google Gemini (`gemini-2.0-flash` / `gemini-1.5-pro` and `text-embedding-004`) via `@langchain/google-genai` combined with Cohere Rerank (`@langchain/cohere` inside a `ContextualCompressionRetriever`) for our generation and two-stage retrieval pipeline.

## Considered Options
- **OpenAI (GPT-4o + text-embedding-3-small) with pure vector search**: Common, but lacks native multimodal long-document handling out of the box and has higher token costs for lengthy academic papers.
- **Gemini + Cohere Rerank**: Chosen. Gemini provides superior cost-performance and context windows for academic text, while Cohere Rerank provides high-precision cross-encoder reordering of candidate chunks.
