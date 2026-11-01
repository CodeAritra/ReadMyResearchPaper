# 11: Automated Evaluation Runner with CI Quality Gating

**What to build:** Build the `npm run eval` command that runs the golden evaluation dataset through the RAG pipeline, routes execution traces to LangSmith's `research-paper-qna-evals` project, scores outputs with the Gemini judges, prints a summary table to the console, and exits with code 1 if metrics regress below quality thresholds.

**Blocked by:** 08: Pure LangSmith Cloud Tracing & Project Isolation, 09: Seeded Manuscript Golden Evaluation Dataset, 10: Gemini 2.5 Flash LLM Judges with Chain-of-Thought Rubrics

**Status:** completed

- [x] Implement `apps/server/src/evals/runner.ts` that iterates through golden test cases and queries the RAG pipeline.
- [x] Direct telemetry to `LANGCHAIN_PROJECT="research-paper-qna-evals"` during evaluation execution.
- [x] Evaluate every test output across the Extended Academic Triad judges and aggregate average scores.
- [x] Format and print results table with status badges and latencies.
- [x] Enforce gating thresholds (Faithfulness >= 0.85, Citation Precision >= 0.90, Answer Relevance >= 0.80) and exit with code 1 on regression.
- [x] Add `"eval"` script in root `package.json` and `apps/server/package.json`.
