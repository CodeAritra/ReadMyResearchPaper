import { describe, it, expect, beforeEach } from 'vitest';
import { executeAgentQuery } from './services/agentService.js';
import { retrievalService, chunkPaperBySections } from './services/retrieval.js';
import { Paper } from '@research-qna/types';

describe('Agent Query Router & Tool Selection Seam (Ticket 06)', () => {
  const samplePaper: Paper = {
    id: 'paper-agent-test',
    title: 'Residual Learning for Image Recognition',
    authors: ['He et al.'],
    pageCount: 5,
    filePath: '/tmp/resnet.pdf',
    createdAt: new Date().toISOString(),
  };

  const sampleMarkdown = `# Residual Learning for Image Recognition
## Deep Residual Learning
[PAGE 3]
We explicitly reformulate the layers as learning residual functions with reference to the layer inputs.
$$F(x) = H(x) - x$$`;

  beforeEach(async () => {
    const chunks = chunkPaperBySections(samplePaper, sampleMarkdown);
    await retrievalService.indexChunks(chunks);
  });

  it('routes manuscript queries to search_uploaded_papers with uploaded_paper provenance', async () => {
    const result = await executeAgentQuery({
      query: 'What is the residual learning formulation in section Deep Residual Learning?',
      paperId: samplePaper.id,
    });

    expect(result.toolUsed).toBe('search_uploaded_papers');
    expect(result.attributions.length).toBeGreaterThan(0);
    expect(result.attributions[0].sourceType).toBe('uploaded_paper');
    expect(result.attributions[0].sectionTitle).toBe('Deep Residual Learning');
    expect(result.text).toContain('F(x)');
  });

  it('routes external literature queries to search_arxiv with arxiv provenance', async () => {
    const result = await executeAgentQuery({
      query: 'Search arXiv preprints for recent self-supervised learning baselines',
    });

    expect(result.toolUsed).toBe('search_arxiv');
    expect(result.attributions.length).toBeGreaterThan(0);
    expect(result.attributions[0].sourceType).toBe('arxiv');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('routes external web queries to search_web with web provenance', async () => {
    const result = await executeAgentQuery({
      query: 'Search web for latest PyTorch documentation on distributed training',
    });

    expect(result.toolUsed).toBe('search_web');
    expect(result.attributions.length).toBeGreaterThan(0);
    expect(result.attributions[0].sourceType).toBe('web');
    expect(result.text.length).toBeGreaterThan(0);
  });
});
