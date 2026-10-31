import { Attribution, QueryRequest, SourceProvenance } from '@research-qna/types';
import {
  searchUploadedPapersTool,
  searchArxivTool,
  searchWebTool,
  ToolEvidence,
} from './agentTools.js';

export interface AgentQueryResult {
  text: string;
  attributions: Attribution[];
  toolUsed: 'search_uploaded_papers' | 'search_arxiv' | 'search_web';
}

export function routeQueryIntent(request: QueryRequest): 'search_uploaded_papers' | 'search_arxiv' | 'search_web' {
  const q = request.query.toLowerCase();

  // If explicit paper or collection is targeted, always prioritize uploaded papers
  if (request.paperId || request.collectionId) {
    return 'search_uploaded_papers';
  }

  if (q.includes('arxiv') || q.includes('preprint')) {
    return 'search_arxiv';
  }

  if (q.includes('search web') || q.includes('web') || q.includes('documentation') || q.includes('online')) {
    return 'search_web';
  }

  return 'search_uploaded_papers';
}

export async function executeAgentQuery(request: QueryRequest): Promise<AgentQueryResult> {
  const toolUsed = routeQueryIntent(request);
  let toolOutput = '[]';

  if (toolUsed === 'search_uploaded_papers') {
    toolOutput = await searchUploadedPapersTool.invoke({
      query: request.query,
      paperId: request.paperId,
      collectionId: request.collectionId,
    });
  } else if (toolUsed === 'search_arxiv') {
    toolOutput = await searchArxivTool.invoke({
      query: request.query,
    });
  } else {
    toolOutput = await searchWebTool.invoke({
      query: request.query,
    });
  }

  const evidenceList: ToolEvidence[] = JSON.parse(toolOutput);

  if (evidenceList.length === 0) {
    return {
      text: 'The requested source did not contain sufficient evidence to answer this question.',
      attributions: [],
      toolUsed,
    };
  }

  const attributions: Attribution[] = evidenceList.map((item) => ({
    paperId: item.paperId,
    paperTitle: item.paperTitle,
    sectionTitle: item.sectionTitle,
    pageNumber: item.pageNumber,
    snippet: item.content.slice(0, 150) + (item.content.length > 150 ? '...' : ''),
    sourceType: item.sourceType,
  }));

  const firstEvidence = evidenceList[0];
  let responseText = '';

  if (toolUsed === 'search_uploaded_papers') {
    responseText = `According to [${firstEvidence.paperTitle} · p. ${firstEvidence.pageNumber}] in "${firstEvidence.sectionTitle}": ${firstEvidence.content}`;
  } else if (toolUsed === 'search_arxiv') {
    responseText = `According to external literature [${firstEvidence.paperTitle}]: ${firstEvidence.content}`;
  } else {
    responseText = `According to external web resources [${firstEvidence.paperTitle}]: ${firstEvidence.content}`;
  }

  return {
    text: responseText,
    attributions,
    toolUsed,
  };
}
