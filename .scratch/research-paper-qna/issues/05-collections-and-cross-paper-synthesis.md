# 05: Collection Workspaces & Partitioned Cross-Paper Comparative Synthesis

**What to build:** Multi-paper synthesis across curated Collections. A researcher can group multiple papers into a Collection and ask comparative questions (e.g. comparing architectures or benchmarks). The retrieval engine executes partitioned retrieval per paper to guarantee balanced representation, generating a comparative synthesis with multi-document citations.

**Blocked by:** 04: Grounded Single-Paper Q&A with Interactive Citation Anchors & PDF Viewer

**Status:** completed

- [x] A researcher can create, rename, and manage Collections containing multiple uploaded Papers.
- [x] Partitioned retrieval queries each target paper in the Collection independently, preventing single papers from dominating the context window.
- [x] Cross-paper comparative answers synthesize similarities, differences, and metrics with citations across all compared papers.
- [x] Clicking a Citation Anchor for any paper in the comparative answer switches or previews that specific paper at the referenced page.
- [x] Integration test verifies that a comparative query over multiple test papers returns balanced evidence and citations from each document.
