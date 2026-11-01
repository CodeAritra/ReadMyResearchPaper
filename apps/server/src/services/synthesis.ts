import { Attribution, EvidenceChunk, MessageRole } from '@research-qna/types';
import { retrievalService } from './retrieval.js';
import { collectionStore } from './collectionStore.js';
import { routeQueryIntent } from './agentService.js';
import { searchArxivTool, searchWebTool, ToolEvidence } from './agentTools.js';
import { Response } from 'express';

export interface SynthesisOptions {
  query: string;
  paperId?: string;
  collectionId?: string;
  history?: Array<{ role: MessageRole; content: string }>;
  onToken?: (token: string) => void;
}

export interface SynthesisResult {
  text: string;
  attributions: Attribution[];
  relevantChunks: EvidenceChunk[];
  toolUsed: string;
}

/**
 * Core synthesis function that handles retrieval, tool selection,
 * LLM generation (with Gemini streaming callback), and deterministic fallback.
 */
export async function generateGroundedSynthesis(
  options: SynthesisOptions
): Promise<SynthesisResult> {
  const { query, paperId, collectionId, onToken } = options;
  const toolUsed = routeQueryIntent({ query, paperId, collectionId });

  // Handle external search seams (arXiv / Web)
  if (toolUsed === 'search_arxiv' || toolUsed === 'search_web') {
    const toolOutput =
      toolUsed === 'search_arxiv'
        ? await searchArxivTool.invoke({ query })
        : await searchWebTool.invoke({ query });

    const evidenceList: ToolEvidence[] = JSON.parse(toolOutput);
    const attributions: Attribution[] = evidenceList.map((item) => ({
      paperId: item.paperId,
      paperTitle: item.paperTitle,
      sectionTitle: item.sectionTitle,
      pageNumber: item.pageNumber,
      snippet: item.content.slice(0, 150) + (item.content.length > 150 ? '...' : ''),
      sourceType: item.sourceType,
    }));

    const first = evidenceList[0];
    const text =
      toolUsed === 'search_arxiv'
        ? `According to external literature [${first.paperTitle}]: ${first.content}`
        : `According to external web resources [${first.paperTitle}]: ${first.content}`;

    if (onToken) {
      const tokens = text.split(' ');
      for (let i = 0; i < tokens.length; i++) {
        const token = (i === 0 ? '' : ' ') + tokens[i];
        onToken(token);
      }
    }

    return {
      text,
      attributions,
      relevantChunks: [],
      toolUsed,
    };
  }

  // Retrieve candidate Evidence Chunks
  let relevantChunks: EvidenceChunk[] = [];
  if (collectionId) {
    const collection = collectionStore.getCollection(collectionId);
    if (collection && collection.paperIds.length > 0) {
      relevantChunks = await retrievalService.searchPartitioned(query, collection.paperIds, 2);
    }
  } else {
    relevantChunks = await retrievalService.search(query, {
      paperId,
      limit: 4,
    });
  }

  const topScore = relevantChunks[0]?.score ?? 0;
  // If score is a float <= 1 (cosine similarity from Qdrant), require >= 0.55
  // If score is integer > 1 (BM25 keyword matches), require >= 1
  const hasStrongEvidence =
    relevantChunks.length > 0 &&
    (topScore > 1 ? topScore >= 1 : topScore >= 0.80);

  if (!hasStrongEvidence) {
    const refusalText =
      'The uploaded paper does not contain sufficient evidence to answer this question. Please refer directly to the document sections or ask a question directly related to the methodology, results, or concepts presented in the text.';

    if (onToken) {
      const tokens = refusalText.split(' ');
      for (let i = 0; i < tokens.length; i++) {
        const token = (i === 0 ? '' : ' ') + tokens[i];
        onToken(token);
      }
    }

    return {
      text: refusalText,
      attributions: [],
      relevantChunks: [],
      toolUsed,
    };
  }

  const attributions: Attribution[] = relevantChunks.slice(0, 6).map((chunk) => ({
    paperId: chunk.paperId,
    paperTitle: chunk.paperTitle,
    sectionTitle: chunk.sectionTitle,
    pageNumber: chunk.pageNumber,
    snippet: chunk.content.slice(0, 150) + (chunk.content.length > 150 ? '...' : ''),
    sourceType: 'uploaded_paper',
  }));

  // If Gemini API Key is available, invoke ChatGoogleGenerativeAI
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && !apiKey.includes('your_gemini_api_key')) {
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const geminiModel = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
      const model = new ChatGoogleGenerativeAI({
        apiKey,
        model: geminiModel,
        temperature: 0.1,
        maxRetries: 1,
      });

      const contextText = relevantChunks
        .map(
          (c) =>
            `[Paper: ${c.paperTitle} | Section: ${c.sectionTitle} | Page: ${c.pageNumber}]\n${c.content}`
        )
        .join('\n\n---\n\n');

      const systemPrompt = `You are an academic research assistant. Answer the user question strictly using the provided context passages. 
Every factual claim must cite its source in the format [Section, p. X] or [Paper Title · p. X]. 
If comparing multiple papers, balance citations across each compared paper.
If the context does not contain sufficient evidence to answer, state explicitly: "The paper does not contain sufficient evidence to answer this question."`;

      const stream = await model.stream([
        { role: 'system', content: `${systemPrompt}\n\nContext:\n${contextText}` },
        { role: 'user', content: query },
      ]);

      let fullText = '';
      for await (const chunk of stream) {
        const text = typeof chunk.content === 'string' ? chunk.content : '';
        if (text) {
          fullText += text;
          onToken?.(text);
        }
      }

      return {
        text: fullText,
        attributions,
        relevantChunks,
        toolUsed,
      };
    } catch (err) {
      console.warn('[Synthesis] Gemini stream failed, using deterministic synthesizer fallback:', err);
    }
  }

  // Deterministic grounded synthesizer for tests and offline dev
  const distinctPapers = Array.from(new Set(relevantChunks.map((c) => c.paperId)));
  let summaryTokens: string[] = [];

  if (distinctPapers.length > 1) {
    summaryTokens.push('Comparative synthesis across papers in collection:\n\n');
    for (const pid of distinctPapers) {
      const chunk = relevantChunks.find((c) => c.paperId === pid);
      if (chunk) {
        summaryTokens.push(
          `- [${chunk.paperTitle} · p. ${chunk.pageNumber}] (${chunk.sectionTitle}): ${chunk.content.slice(0, 150)}...\n`
        );
      }
    }
  } else {
    const topChunk = relevantChunks[0];
    summaryTokens = [
      `Based on `,
      `[${topChunk.paperTitle} · p. ${topChunk.pageNumber}], `,
      `in section "${topChunk.sectionTitle}": `,
      topChunk.content.slice(0, 200),
      topChunk.content.length > 200 ? '...' : '',
    ];
  }

  const text = summaryTokens.join('');
  if (onToken) {
    for (const token of summaryTokens) {
      onToken(token);
    }
  }

  return {
    text,
    attributions,
    relevantChunks,
    toolUsed,
  };
}

/**
 * Express SSE stream handler for chat synthesis.
 */
export async function streamGroundedSynthesis(
  res: Response,
  options: SynthesisOptions
): Promise<void> {
  const toolUsed = routeQueryIntent(options);
  res.write(`data: ${JSON.stringify({ tool: toolUsed })}\n\n`);

  const result = await generateGroundedSynthesis({
    ...options,
    onToken: (token) => {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    },
  });

  res.write(`data: ${JSON.stringify({ attributions: result.attributions })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}
