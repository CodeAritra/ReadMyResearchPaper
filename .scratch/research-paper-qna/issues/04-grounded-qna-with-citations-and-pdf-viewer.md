# 04: Grounded Single-Paper Q&A with Interactive Citation Anchors & PDF Viewer

**What to build:** The primary interactive research workbench. A researcher can read a paper in a responsive split-screen PDF viewer while asking questions in the chat pane. The model generates answers grounded strictly in retrieved Evidence Chunks, rendering inline Citation Anchors. Clicking an anchor smoothly jumps the PDF viewer to the exact referenced page.

**Blocked by:** 03: Hybrid Retrieval & Reranking Index (Qdrant Cloud + Cohere Rerank)

**Status:** ready-for-agent

- [ ] Web UI displays a split-screen workbench with a responsive PDF viewer on the left and streaming discussion on the right.
- [ ] LangChain synthesis chain generates answers grounded strictly in retrieved Evidence Chunks with an explicit refusal policy when evidence is missing.
- [ ] Generated answers render clickable Citation Anchors (e.g. `[Paper A · p. 4]`) pointing to exact page numbers and sections.
- [ ] Clicking any Citation Anchor badge jumps the PDF viewer directly to the designated page.
- [ ] Integration test verifies that a grounded query returns streaming text with valid citation metadata and triggers page navigation.
