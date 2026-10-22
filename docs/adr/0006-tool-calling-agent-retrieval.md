# Tool-Calling Agent Architecture for Pluggable Retrieval

We decided to structure the LangChain reasoning layer as a tool-calling agent rather than a hardcoded single-source retrieval chain.

## Context
While the immediate requirement is querying user-curated local Collections of research papers, the project roadmap includes external search across web literature and arXiv. A monolithic `createRetrievalChain` would require rewriting when adding external web search.

## Decision
The core agent is equipped with a `search_uploaded_papers` tool backed by our Qdrant hybrid retriever and Cohere reranker. The architecture leaves a clean interface seam for plug-in tools (`search_arxiv`, `search_web`), enabling the agent to autonomously route between local collection analysis, external literature retrieval, or a synthesis of both.
