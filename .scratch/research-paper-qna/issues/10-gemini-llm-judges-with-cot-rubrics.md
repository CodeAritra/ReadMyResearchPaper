# 10: Gemini 2.5 Flash LLM Judges with Chain-of-Thought Rubrics

**What to build:** Implement native TypeScript LLM judges powered by Gemini 2.5 Flash with Zod schemas to evaluate the Extended Academic Triad. Every judge enforces a discrete rubric requiring Chain-of-Thought reasoning steps before outputting normalized scores between 0.0 and 1.0.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Implement `faithfulnessJudge.ts` to extract claims from the agent response and verify direct entailment against retrieved Evidence Chunks.
- [x] Implement `citationPrecisionJudge.ts` to verify that clickable Citation Anchors link to the specific page and section containing supporting text.
- [x] Implement `contextRelevanceJudge.ts` and `answerRelevanceJudge.ts` to evaluate retrieval precision and query fulfillment.
- [x] Ensure all judges return structured Zod outputs with discrete scores (0.0, 0.5, 1.0) and reasoning rationale.
