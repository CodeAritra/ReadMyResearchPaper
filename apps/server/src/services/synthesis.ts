import { Attribution, EvidenceChunk } from '@research-qna/types';
import { retrievalService } from './retrieval.js';
import { Response } from 'express';

export interface SynthesisOptions {
  query: string;
  paperId?: string;
  history?: Array<{ role: string; content: string }>;
}

export async function streamGroundedSynthesis(
  res: Response,
  options: SynthesisOptions
): Promise<void> {
  const { query, paperId } = options;

  // Retrieve candidate Evidence Chunks
  const relevantChunks = await retrievalService.search(query, {
    paperId,
    limit: 4,
  });

  // Evaluate evidence quality: If no matches or score is zero, refuse
  const hasStrongEvidence =
    relevantChunks.length > 0 && (relevantChunks[0].score ?? 0) > 0;

  if (!hasStrongEvidence) {
    const refusalText =
      'The uploaded paper does not contain sufficient evidence to answer this question. Please refer directly to the document sections or ask a question directly related to the methodology, results, or concepts presented in the text.';

    const tokens = refusalText.split(' ');
    for (let i = 0; i < tokens.length; i++) {
      const token = (i === 0 ? '' : ' ') + tokens[i];
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ attributions: [] })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // Construct Attributions from top matching chunks
  const attributions: Attribution[] = relevantChunks.slice(0, 3).map((chunk) => ({
    paperId: chunk.paperId,
    paperTitle: chunk.paperTitle,
    sectionTitle: chunk.sectionTitle,
    pageNumber: chunk.pageNumber,
    snippet: chunk.content.slice(0, 150) + (chunk.content.length > 150 ? '...' : ''),
  }));

  // If Gemini API Key is available, invoke LangChain ChatGoogleGenerativeAI
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const model = new ChatGoogleGenerativeAI({
        apiKey,
        model: 'gemini-2.0-flash',
        temperature: 0.1,
      });

      const contextText = relevantChunks
        .map(
          (c) =>
            `[Paper: ${c.paperTitle} | Section: ${c.sectionTitle} | Page: ${c.pageNumber}]\n${c.content}`
        )
        .join('\n\n---\n\n');

      const systemPrompt = `You are an academic research assistant. Answer the user question strictly using the provided context passages. 
Every factual claim must cite its source in the format [Section, p. X]. 
If the context does not contain sufficient evidence to answer, state explicitly: "The paper does not contain sufficient evidence to answer this question."`;

      const stream = await model.stream([
        { role: 'system', content: `${systemPrompt}\n\nContext:\n${contextText}` },
        { role: 'user', content: query },
      ]);

      for await (const chunk of stream) {
        const text = typeof chunk.content === 'string' ? chunk.content : '';
        if (text) {
          res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ attributions })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    } catch (err) {
      console.warn('[Synthesis] Gemini stream failed, using deterministic synthesizer fallback:', err);
    }
  }

  // High-performance deterministic grounded synthesizer for tests and offline local dev
  const topChunk = relevantChunks[0];
  const summaryTokens = [
    `Based on `,
    `[${topChunk.paperTitle} · p. ${topChunk.pageNumber}], `,
    `in section "${topChunk.sectionTitle}": `,
    topChunk.content.slice(0, 200),
    topChunk.content.length > 200 ? '...' : '',
  ];

  for (const token of summaryTokens) {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ attributions })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}
