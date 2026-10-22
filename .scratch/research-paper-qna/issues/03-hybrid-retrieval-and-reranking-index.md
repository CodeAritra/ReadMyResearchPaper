# 03: Hybrid Retrieval & Reranking Index (Qdrant Cloud + Cohere Rerank)

**What to build:** An indexing and retrieval pipeline that segments ingested papers into section-aware Evidence Chunks with rich provenance metadata, indexes them in a hybrid vector store (dense embeddings and sparse BM25 keyword vectors), and filters search candidates through a cross-encoder reranker before feeding them to generation.

**Blocked by:** 02: Asynchronous PDF Ingestion & Multimodal Structure Extraction

**Status:** completed

- [x] Parsed papers are chunked along structural section boundaries into 500–800 token units with 100-token overlap.
- [x] Every Evidence Chunk contains complete provenance metadata (`paperId`, `paperTitle`, `sectionTitle`, `pageNumber`, `chunkIndex`).
- [x] Chunks are embedded and indexed into Qdrant Cloud using hybrid sparse and dense vectors.
- [x] Candidate chunks for a query are re-scored using Cohere Rerank v3 to prioritize the top relevant passages.
- [x] Integration test verifies that querying for technical acronyms, dataset names, and conceptual phrases retrieves the expected chunks with verified metadata.
