# 02: Asynchronous PDF Ingestion & Multimodal Structure Extraction

**What to build:** An asynchronous document ingestion flow allowing a researcher to upload an academic research paper PDF and observe real-time job progress. The server processes the document using multimodal vision extraction to preserve multi-column layouts, tables, and mathematical formulas in clean Markdown, storing the parsed paper metadata and structural sections.

**Blocked by:** 01: Tracer Bullet Monorepo Foundation & Minimal End-to-End Chat Slice

**Status:** completed

- [x] A researcher can select or drag-and-drop a multi-page PDF paper in the web UI and trigger an asynchronous upload.
- [x] The server accepts the upload, returns an immediate job tracking identifier, and executes extraction in the background.
- [x] The web UI displays accurate, live progress stages (such as uploading, parsing, extracting structure, ready) without freezing or timing out.
- [x] Ingestion extracts document text into structured Markdown with intact LaTeX equations and markdown tables.
- [x] Extracted sections and page boundaries are persisted with paper metadata (title, page count).
- [x] Integration test verifies that uploading a PDF returns a valid job identifier that transitions to completed with structured sections recorded.
