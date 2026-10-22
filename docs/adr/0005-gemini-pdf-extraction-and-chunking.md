# Gemini Multimodal Document Extraction and Section-Aware Chunking

We decided to use Google Gemini's multimodal vision API directly from our Express ingestion pipeline to parse academic PDFs into structured Markdown with preserved LaTeX mathematical formulas and tables, followed by section-boundary chunking.

## Context
Academic papers have multi-column layouts, mathematical notations, and tables that traditional regex- or token-based PDF text splitters garble. Rather than running a local heavy Python OCR service or paying for a separate parsing vendor, we utilize our existing Gemini API integration.

## Decision
Each uploaded PDF is processed through Gemini vision parsing to generate Markdown with tagged `# Section` headers and page markers. The text splitter then segments along these semantic section boundaries (500–800 tokens with 100-token overlap), attaching provenance metadata (`paperId`, `pageNumber`, `sectionTitle`) directly into Qdrant payload points.
