import { Client } from 'langsmith';
import { Attribution, EvidenceChunk } from '@research-qna/types';
import { evaluateFaithfulness } from '../evals/judges/faithfulnessJudge.js';
import { evaluateCitationPrecision } from '../evals/judges/citationPrecisionJudge.js';
import {
  evaluateContextRelevance,
  evaluateAnswerRelevance,
} from '../evals/judges/relevanceJudges.js';

export interface OnlineEvalInput {
  runId?: string;
  query: string;
  answer: string;
  evidenceChunks: EvidenceChunk[];
  attributions: Attribution[];
}

/**
 * Executes evaluation judges asynchronously in the background for live production queries,
 * attaching Faithfulness, Citation Precision, Context Relevance, and Answer Relevance
 * scores directly to the LangSmith trace in research-paper-qna.
 */
export function scheduleOnlineEvaluation(input: OnlineEvalInput): void {
  const { runId, query, answer, evidenceChunks, attributions } = input;

  const apiKey = process.env.LANGCHAIN_API_KEY;
  const isTracing = process.env.LANGCHAIN_TRACING_V2 === 'true';

  if (!apiKey || !isTracing || !runId) {
    return;
  }

  // Fire-and-forget background execution: does not block the user response
  (async () => {
    try {
      const [faithfulness, citationPrecision, contextRelevance, answerRelevance] =
        await Promise.all([
          evaluateFaithfulness({
            query,
            answer,
            evidenceChunks,
          }),
          evaluateCitationPrecision({
            query,
            answer,
            attributions,
          }),
          evaluateContextRelevance({
            query,
            evidenceChunks,
          }),
          evaluateAnswerRelevance({
            query,
            answer,
          }),
        ]);

      const client = new Client({ apiKey });

      await Promise.allSettled([
        client.createFeedback(runId, 'faithfulness', {
          score: faithfulness.score,
          comment: faithfulness.reasoning,
        }),
        client.createFeedback(runId, 'citation_precision', {
          score: citationPrecision.score,
          comment: citationPrecision.reasoning,
        }),
        client.createFeedback(runId, 'context_relevance', {
          score: contextRelevance.score,
          comment: contextRelevance.reasoning,
        }),
        client.createFeedback(runId, 'answer_relevance', {
          score: answerRelevance.score,
          comment: answerRelevance.reasoning,
        }),
      ]);

      console.log(
        `[OnlineEval] Logged 4 feedback metrics for trace ${runId}: Faithfulness=${faithfulness.score.toFixed(
          2
        )}, CitationPrecision=${citationPrecision.score.toFixed(
          2
        )}, ContextRelevance=${contextRelevance.score.toFixed(
          2
        )}, AnswerRelevance=${answerRelevance.score.toFixed(2)}`
      );
    } catch (err) {
      console.warn('[OnlineEval] Failed to submit online evaluation feedback:', err);
    }
  })();
}
