import { MetricCritique } from '@research-qna/types';
import { getJudgeModel, parseJudgeJson } from './judgeClient.js';

export interface FaithfulnessInput {
  query: string;
  answer: string;
  evidenceChunks: Array<{
    content: string;
    sectionTitle: string;
    pageNumber: number;
  }>;
  shouldAbstain?: boolean;
}

interface JudgeOutput {
  claims: string[];
  reasoning: string;
  score: number;
}

export async function evaluateFaithfulness(input: FaithfulnessInput): Promise<MetricCritique> {
  const { query, answer, evidenceChunks, shouldAbstain } = input;

  // Handle expected refusal / abstention
  const isRefusal =
    answer.toLowerCase().includes('does not contain sufficient evidence') ||
    answer.toLowerCase().includes('not contain sufficient evidence') ||
    answer.toLowerCase().includes('cannot answer');

  if (shouldAbstain) {
    if (isRefusal) {
      return {
        score: 1.0,
        reasoning: 'The model correctly abstained from answering an ungrounded or out-of-scope question.',
      };
    } else {
      return {
        score: 0.0,
        reasoning: 'The model hallucinated an answer for an out-of-scope question instead of abstaining.',
      };
    }
  }

  const model = getJudgeModel();
  if (model) {
    try {
      const contextText = evidenceChunks
        .map((c) => `[p. ${c.pageNumber} · ${c.sectionTitle}]: ${c.content}`)
        .join('\n\n');

      const prompt = `You are an expert academic peer-review judge evaluating the Faithfulness (groundedness) of a RAG synthesized response.

[Research Query]: ${query}
[Retrieved Evidence Chunks]:
${contextText}

[Candidate Synthesized Response]:
${answer}

TASK:
1. Extract the atomic factual claims made in the synthesized response.
2. For each claim, check whether it is strictly entailed by the Retrieved Evidence Chunks above.
3. Apply this discrete scoring rubric:
   - 1.0: Every factual claim is directly supported by the retrieved Evidence Chunks.
   - 0.5: Most claims are supported, but minor ungrounded details or slight extrapolations are present.
   - 0.0: The answer asserts claims that directly contradict the Evidence Chunks, or invents facts/numbers not present in the chunks (hallucination).

Format your response strictly as JSON with this schema:
{
  "claims": ["string"],
  "reasoning": "step-by-step chain of thought cross-referencing each claim against the chunks",
  "score": 0.0 | 0.5 | 1.0
}`;

      const res = await model.invoke(prompt);
      const rawText = typeof res.content === 'string' ? res.content : '';
      const parsed = parseJudgeJson<JudgeOutput>(rawText);

      if (parsed && typeof parsed.score === 'number' && parsed.reasoning) {
        return {
          score: Math.max(0, Math.min(1, parsed.score)),
          reasoning: parsed.reasoning,
        };
      }
    } catch (err) {
      console.warn('[FaithfulnessJudge] LLM invocation failed, using deterministic evaluation:', err);
    }
  }

  // Deterministic fallback for offline testing
  if (evidenceChunks.length === 0) {
    return isRefusal
      ? { score: 1.0, reasoning: 'Correctly refused when no evidence was retrieved.' }
      : { score: 0.0, reasoning: 'Produced ungrounded claims with zero supporting evidence chunks.' };
  }

  const matchesAnyChunk = evidenceChunks.some((chunk) => {
    const chunkTokens = chunk.content.toLowerCase().split(/\s+/).filter((t) => t.length > 4);
    const answerLower = answer.toLowerCase();
    const hits = chunkTokens.filter((token) => answerLower.includes(token));
    return hits.length >= 3;
  });

  return matchesAnyChunk
    ? { score: 1.0, reasoning: 'Deterministic check: Response shares strong semantic keywords with supporting evidence chunks.' }
    : { score: 0.5, reasoning: 'Deterministic check: Response partially matches evidence chunks.' };
}
