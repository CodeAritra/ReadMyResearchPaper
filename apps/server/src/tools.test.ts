import { describe, it, expect, beforeEach } from 'vitest';
import {
  searchUploadedPapersTool,
  searchArxivTool,
  searchWebTool,
} from './services/agentTools.js';
import { retrievalService, chunkPaperBySections } from './services/retrieval.js';
import { Paper } from '@research-qna/types';

describe('Tool Registry & Invocation Seam (Ticket 06)', () => {
  const samplePaper: Paper = {
    id: 'paper-tool-test',
    title: 'Transformer Research',
    authors: ['Researcher A'],
    pageCount: 3,
    filePath: '/tmp/paper.pdf',
    createdAt: new Date().toISOString(),
  };

  const sampleMarkdown = `# Transformer Research
## Architecture
[PAGE 2]
The architecture relies entirely on self-attention mechanisms and multi-head projection layers.`;

  beforeEach(async () => {
    const chunks = chunkPaperBySections(samplePaper, sampleMarkdown);
    await retrievalService.indexChunks(chunks);
  });

  it('search_uploaded_papers tool returns grounded evidence chunks with uploaded_paper provenance', async () => {
    expect(searchUploadedPapersTool.name).toBe('search_uploaded_papers');

    const resultStr = await searchUploadedPapersTool.invoke({
      query: 'What is the architecture based on?',
      paperId: samplePaper.id,
    });

    const parsed = JSON.parse(resultStr);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    const chunk = parsed[0];
    expect(chunk.paperId).toBe(samplePaper.id);
    expect(chunk.sectionTitle).toBe('Architecture');
    expect(chunk.pageNumber).toBe(2);
    expect(chunk.sourceType).toBe('uploaded_paper');
    expect(chunk.content).toContain('self-attention');
  });

  it('search_arxiv tool returns external literature with arxiv provenance', async () => {
    expect(searchArxivTool.name).toBe('search_arxiv');

    const resultStr = await searchArxivTool.invoke({
      query: 'deep residual learning for image recognition',
    });

    const parsed = JSON.parse(resultStr);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    const first = parsed[0];
    expect(first.sourceType).toBe('arxiv');
    expect(first.paperTitle).toBeDefined();
    expect(first.sectionTitle).toBeDefined();
  });

  it('search_web tool returns external web evidence with web provenance', async () => {
    expect(searchWebTool.name).toBe('search_web');

    const resultStr = await searchWebTool.invoke({
      query: 'frontier AI benchmarks 2026',
    });

    const parsed = JSON.parse(resultStr);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    const first = parsed[0];
    expect(first.sourceType).toBe('web');
  });
});
