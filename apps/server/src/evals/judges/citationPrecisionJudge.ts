import { Attribution, ExpectedCitation, MetricCritique } from '@research-qna/types';
import { getJudgeModel, parseJudgeJson } from './judgeClient.js';

export interface CitationPrecisionInput {
  query: string;
  answer: string;
  attributions: Attribution[];
  expectedCitations?: ExpectedCitation[];
  shouldAbstain?: boolean;
}

interface JudgeOutput {
  citationsFound: string[];
  reasoning: string;
  score: number;
}

export async function evaluateCitationPrecision(input: CitationPrecisionInput): Promise<MetricCritique> {
  const { query, answer, attributions, expectedCitations = [], shouldAbstain } = input;

  // Handle expected refusal / abstention
  if (shouldAbstain) {
    const hasCitations = /\[[^\]]*p\.\s*\d+[^\]]*\]/i.test(answer) || attributions.length > 0;
    if (!hasCitations) {
      return {
        score: 1.0,
        reasoning: 'Correctly omitted citations when abstaining from an out-of-scope question.',
      };
    } else {
      return {
        score: 0.0,
        reasoning: 'Hallucinated citation anchors for an out-of-scope query.',
      };
    }
  }

  // Extract citation anchors like [Attention Is All You Need · p. 4] or [Section 3.2, p. 4]
  const citationMatches = answer.match(/\[[^\]]*p\.\s*\d+[^\]]*\]/gi) || [];

  const model = getJudgeModel();
  if (model) {
    try {
      const expectedText = expectedCitations
        .map((c) => `- Page ${c.pageNumber}: "${c.sectionTitle}"`)
        .join('\n');

      const prompt = `You are an expert academic peer-review judge evaluating the Citation Precision of a RAG response.

[Research Query]: ${query}
[Synthesized Response]:
${answer}

[Expected Ground-Truth Citations]:
${expectedText || 'None required'}

[Retrieved Attributions]:
${attributions.map((a) => `- [${a.paperTitle} · p. ${a.pageNumber}] ${a.sectionTitle}`).join('\n')}

TASK:
1. Examine every citation anchor in the synthesized response (e.g., [Paper Title · p. X]).
2. Check whether the citations point accurately to the supporting page numbers and sections.
3. Scoring Rubric:
   - 1.0: All citations link precisely to the correct page and section supporting the asserted claim.
   - 0.5: Citations are present, but link to an adjacent or loosely related page/section.
   - 0.0: Citations point to incorrect/hallucinated pages, or ungrounded assertions lack citations entirely.

Format your response strictly as JSON with this schema:
{
  "citationsFound": ["string"],
  "reasoning": "step-by-step evaluation of each citation against the expected pages",
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
      console.warn('[CitationPrecisionJudge] LLM invocation failed, using deterministic evaluation:', err);
    }
  }

  // Deterministic fallback
  if (expectedCitations.length === 0) {
    return { score: 1.0, reasoning: 'No citations strictly required for this test case.' };
  }

  const expectedPages = expectedCitations.map((c) => c.pageNumber);
  const foundMatchingPage = expectedPages.some((p) => {
    const pageRegex = new RegExp(`p\\.\\s*${p}\\b`, 'i');
    const inText = pageRegex.test(answer);
    const inAttributions = attributions.some((a) => a.pageNumber === p);
    return inText || inAttributions;
  });

  if (foundMatchingPage) {
    return {
      score: 1.0,
      reasoning: `Deterministic check: Successfully identified citation on expected page (${expectedPages.join(', ')}).`,
    };
  }

  return {
    score: 0.0,
    reasoning: `Deterministic check: Missing expected citation for page (${expectedPages.join(', ')}).`,
  };
}
