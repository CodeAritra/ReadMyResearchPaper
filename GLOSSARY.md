# Research Paper Q&A

A domain-focused question answering and retrieval-augmented generation (RAG) system for academic research papers, providing verified citations and deep structure-aware analysis.

## Language

### Documents & Structure

**Paper**:
An individual academic manuscript, typically ingested in PDF format, containing structured sections, figures, tables, and mathematical notation.
_Avoid_: Document, file, article

**Collection**:
A user-curated workspace or grouping of Papers queried together for single-paper or cross-paper synthesis.
_Avoid_: Folder, project, bucket

**Section**:
A logical structural division within a Paper (such as Abstract, Introduction, Methodology, Results, Discussion).
_Avoid_: Chapter, part, segment

**Evidence Chunk**:
A discrete semantic unit (passage, table, or formula) extracted from a Paper, retaining strict provenance metadata including page number and section title.
_Avoid_: Text block, fragment, split

### Ingestion & Indexing

**Ingestion Job**:
An asynchronous background task that parses, extracts structure from, chunks, and indexes a Paper into a Collection.
_Avoid_: Upload task, indexing process

### Retrieval & Synthesis

**Attribution**:
An explicit, verifiable citation embedded in a generated response that points directly to one or more supporting Evidence Chunks.
_Avoid_: Reference, link, source note

**Citation Anchor**:
An interactive, clickable reference tag inside the UI response that jumps the PDF viewer directly to the corresponding page and Evidence Chunk.
_Avoid_: Footnote, source badge

**Retriever**:
A pluggable component responsible for fetching candidate Evidence Chunks matching a query from an underlying data source.
_Avoid_: Search engine, fetcher, loader

**Query Router**:
A coordinator that inspects user queries and routes them to the appropriate Retriever (such as local Collection or future Web/arXiv providers).
_Avoid_: Dispatcher, classifier, broker

**Partitioned Retrieval**:
A multi-paper retrieval strategy that fetches top Evidence Chunks for each paper independently to guarantee balanced representation across papers.
_Avoid_: Balanced search, bucketed query

### Evaluation & Observability

**Evaluation Suite**:
A curated collection of benchmark papers, golden question-answer pairs, and automated scoring metrics used to measure RAG system quality.
_Avoid_: Test suite, eval benchmark, validation set

**Faithfulness**:
The degree to which every claim in an agent's synthesized answer is grounded in and directly entailed by the retrieved Evidence Chunks.
_Avoid_: Groundedness, hallucination score, truthfulness

**Citation Precision**:
The metric measuring whether clickable Citation Anchors correctly point to the specific pages, sections, and Evidence Chunks that factually support each asserted claim.
_Avoid_: Anchor accuracy, reference recall, citation score

**Execution Trace**:
An end-to-end telemetry record capturing query lifecycle steps, including tool invocations, token latencies, model inputs, and retrieved chunks.
_Avoid_: Log entry, run span, request record
