# 08: Pure LangSmith Cloud Tracing & Project Isolation

**What to build:** Route all telemetry, LLM calls, tool executions, and retrieval latencies directly into LangSmith Cloud without custom ad-hoc console loggers. Establish project separation between live user operations (`research-paper-qna`) and benchmark evaluation runs (`research-paper-qna-evals`).

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Ensure `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, and `LANGCHAIN_PROJECT` are seamlessly resolved in both development and production environments.
- [x] Verify that LangChain agent invocations and nested tool calls (`search_uploaded_papers`) automatically stream execution spans into LangSmith Cloud.
- [x] Provide utility support for dynamic project switching to `research-paper-qna-evals` during automated evaluation runs.
- [x] Confirm no extraneous console tracing overhead is introduced to maintain clean academic server logs.
