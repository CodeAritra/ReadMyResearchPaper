import { MetricCritique } from '@research-qna/types';
import { getJudgeModel, parseJudgeJson } from './judgeClient.js';

export interface ContextRelevanceInput {
  query: string;
  evidenceChunks: Array<{
    content: string;
    sectionTitle: string;
  }>;
}

export interface AnswerRelevanceInput {
  query: string;
  answer: string;
  referenceAnswer?: string;
  shouldAbstain?: boolean;
}

interface JudgeOutput {
  reasoning: string;
  score: number;
}

export async function evaluateContextRelevance(input: ContextRelevanceInput): Promise<MetricCritique> {
  const { query, evidenceChunks } = input;

  if (evidenceChunks.length === 0) {
    return {
      score: 0.0,
      reasoning: 'No evidence chunks were retrieved.',
    };
  }

  const model = getJudgeModel();
  if (model) {
    try {
      const chunksText = evidenceChunks.map((c, i) => `[Chunk ${i + 1} - ${c.sectionTitle}]: ${c.content}`).join('\n\n');
      const prompt = `You are an academic retrieval evaluator assessing Context Relevance.

[User Query]: ${query}
[Retrieved Evidence Chunks]:
${chunksText}

TASK:
Evaluate whether the retrieved evidence chunks contain relevant, high-signal information needed to answer the query.
Rubric:
- 1.0: Chunks are highly relevant and directly contain the context needed.
- 0.5: Chunks are broadly related to the topic, but only tangential to the exact question.
- 0.0: Chunks are completely irrelevant noise.

Format strictly as JSON:
{
  "reasoning": "brief explanation",
  "score": 0.0 | 0.5 | 1.0
}`;

      const res = await model.invoke(prompt);
      const parsed = parseJudgeJson<JudgeOutput>(typeof res.content === 'string' ? res.content : '');
      if (parsed && typeof parsed.score === 'number' && parsed.reasoning) {
        return {
          score: Math.max(0, Math.min(1, parsed.score)),
          reasoning: parsed.reasoning,
        };
      }
    } catch (err) {
      console.warn('[ContextRelevanceJudge] LLM invocation failed, using fallback:', err);
    }
  }

  // Deterministic fallback: check keyword presence
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  let matches = 0;
  for (const chunk of evidenceChunks) {
    const contentLower = chunk.content.toLowerCase();
    if (queryWords.some((w) => contentLower.includes(w))) {
      matches++;
    }
  }

  const ratio = matches / evidenceChunks.length;
  const score = ratio >= 0.5 ? 1.0 : ratio > 0 ? 0.5 : 0.0;
  return {
    score,
    reasoning: `Deterministic check: ${matches} of ${evidenceChunks.length} chunks match key query terms.`,
  };
}

export async function evaluateAnswerRelevance(input: AnswerRelevanceInput): Promise<MetricCritique> {
  const { query, answer, referenceAnswer, shouldAbstain } = input;

  // Expected abstention check
  const isRefusal =
    answer.toLowerCase().includes('does not contain sufficient evidence') ||
    answer.toLowerCase().includes('not contain sufficient evidence') ||
    answer.toLowerCase().includes('cannot answer');

  if (shouldAbstain) {
    return isRefusal
      ? { score: 1.0, reasoning: 'Correctly refused out-of-scope query directly.' }
      : { score: 0.0, reasoning: 'Failed to refuse out-of-scope query.' };
  }

  const model = getJudgeModel();
  if (model) {
    try {
      const prompt = `You are an academic evaluator assessing Answer Relevance.

[User Query]: ${query}
[Synthesized Response]:
${answer}
${referenceAnswer ? `[Reference Answer]:\n${referenceAnswer}` : ''}

TASK:
Evaluate whether the synthesized response directly, clearly, and completely answers the research query.
Rubric:
- 1.0: Response answers the query directly, completely, and accurately without evasion.
- 0.5: Response answers partially or misses significant aspects.
- 0.0: Response completely evades, gives irrelevant information, or misunderstands the question.

Format strictly as JSON:
{
  "reasoning": "brief explanation",
  "score": 0.0 | 0.5 | 1.0
}`;

      const res = await model.invoke(prompt);
      const parsed = parseJudgeJson<JudgeOutput>(typeof res.content === 'string' ? res.content : '');
      if (parsed && typeof parsed.score === 'number' && parsed.reasoning) {
        return {
          score: Math.max(0, Math.min(1, parsed.score)),
          reasoning: parsed.reasoning,
        };
      }
    } catch (err) {
      console.warn('[AnswerRelevanceJudge] LLM invocation failed, using fallback:', err);
    }
  }

  // Deterministic fallback
  if (answer.trim().length > 25 && !isRefusal) {
    return { score: 1.0, reasoning: 'Deterministic check: Response is substantive and non-empty.' };
  }

  return { score: 0.5, reasoning: 'Deterministic check: Response is brief or uncertain.' };
}
