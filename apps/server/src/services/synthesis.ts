import { Attribution, EvidenceChunk } from '@research-qna/types';
import { retrievalService } from './retrieval.js';
import { collectionStore } from './collectionStore.js';
import { routeQueryIntent } from './agentService.js';
import { searchArxivTool, searchWebTool, ToolEvidence } from './agentTools.js';
import { Response } from 'express';

export interface SynthesisOptions {
  query: string;
  paperId?: string;
  collectionId?: string;
  history?: Array<{ role: string; content: string }>;
}

export async function streamGroundedSynthesis(
  res: Response,
  options: SynthesisOptions
): Promise<void> {
  const { query, paperId, collectionId } = options;

  // Agent Tool Query Routing Seam
  const toolUsed = routeQueryIntent({ query, paperId, collectionId });
  res.write(`data: ${JSON.stringify({ tool: toolUsed })}\n\n`);

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

    const tokens = text.split(' ');
    for (let i = 0; i < tokens.length; i++) {
      const token = (i === 0 ? '' : ' ') + tokens[i];
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ attributions })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // Retrieve candidate Evidence Chunks (partitioned across collection papers if collectionId provided)
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

  // Construct Attributions ensuring balanced representation across papers
  const attributions: Attribution[] = relevantChunks.slice(0, 6).map((chunk) => ({
    paperId: chunk.paperId,
    paperTitle: chunk.paperTitle,
    sectionTitle: chunk.sectionTitle,
    pageNumber: chunk.pageNumber,
    snippet: chunk.content.slice(0, 150) + (chunk.content.length > 150 ? '...' : ''),
    sourceType: 'uploaded_paper',
  }));

  // If Gemini API Key is available, invoke LangChain ChatGoogleGenerativeAI
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
      const model = new ChatGoogleGenerativeAI({
        apiKey,
        model: geminiModel,
        temperature: 0.1,
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

  for (const token of summaryTokens) {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ attributions })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}
