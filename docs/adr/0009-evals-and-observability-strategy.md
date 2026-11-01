# Evaluations and Observability Strategy

We decided to use pure LangSmith Cloud for observability and an in-tree TypeScript LLM-as-a-judge evaluation harness powered by Gemini 2.5 Flash for continuous RAG quality measurement. LangSmith provides native, zero-code tracing for all LangChain agent steps, tool executions, and retrieval latencies. The evaluation suite runs offline via `npm run eval`, measuring an Extended Academic Triad (Context Relevance, Faithfulness, Answer Relevance, and Citation Precision) against a version-controlled golden dataset, isolating evaluation traces into a dedicated LangSmith project.

## Considered Options
- **External Python Frameworks (Ragas / DeepEval)**: Feature-rich standardized metrics, but requires introducing a secondary Python runtime and environment dependencies into a pure TypeScript monorepo.
- **Custom In-Memory / Console Trace Logging**: Minimal dependencies, but requires manual span creation and lacks visual trace debugging, latency breakdown trees, and token analytics.
- **LangSmith Cloud + Native Gemini 2.5 Flash Judge (Chosen)**: Zero-overhead agent tracing through existing `@langchain/core` integration and native TypeScript LLM-as-a-judge scorers utilizing the existing Google Gemini API key.

## Consequences
- Requires `LANGCHAIN_TRACING_V2=true` and `LANGCHAIN_API_KEY` in environment variables for trace ingestion.
- Evaluation runs automatically route to the `research-paper-qna-evals` project to preserve clean production metrics.
- CI/CD can gate deployments based on deterministic metric thresholds (Faithfulness >= 0.85, Citation Precision >= 0.90).
