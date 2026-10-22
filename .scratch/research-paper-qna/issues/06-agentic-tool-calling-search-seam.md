# 06: Agentic Tool-Calling Seam for Future Academic Search (ArXiv / Web)

**What to build:** An extensible tool-calling agent layer in LangChain that encapsulates local collection retrieval as a distinct tool, while exposing a clean interface seam for external academic search tools (such as arXiv and web search). The agent dynamically selects tools based on query intent and indicates to the researcher which tool supplied the findings.

**Blocked by:** 04: Grounded Single-Paper Q&A with Interactive Citation Anchors & PDF Viewer

**Status:** ready-for-agent

- [ ] Local retrieval is encapsulated behind a LangChain tool (`search_uploaded_papers`).
- [ ] An extensible tool interface is established for external search providers (`search_arxiv`, `search_web`).
- [ ] The agent autonomously routes queries to the appropriate tool based on user prompt context.
- [ ] UI displays subtle, non-intrusive provenance badges showing whether an answer was derived from uploaded papers or external sources.
- [ ] Integration test verifies that the agent correctly calls the local search tool when queried about uploaded paper content.
