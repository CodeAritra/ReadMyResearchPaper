import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { retrievalService, chunkPaperBySections } from './services/retrieval.js';
import { Paper } from '@research-qna/types';

describe('Grounded Synthesis & Attribution Seam (Ticket 04)', () => {
  const samplePaper: Paper = {
    id: 'paper-attention-synth-test',
    title: 'Attention Is All You Need',
    authors: ['Vaswani et al.'],
    year: 2017,
    pageCount: 11,
    filePath: '/tmp/attention.pdf',
    createdAt: new Date().toISOString(),
  };

  const sampleMarkdown = `# Attention Is All You Need

## Abstract
[PAGE 1]
We propose the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.

## Methodology
[PAGE 3]
The Transformer computes self-attention using queries, keys, and values:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
Multi-Head Attention allows the model to jointly attend to information at different positions.

## Results
[PAGE 7]
On the WMT 2014 English-to-German translation task, the Transformer achieves 28.4 BLEU.
`;

  beforeEach(async () => {
    const chunks = chunkPaperBySections(samplePaper, sampleMarkdown);
    await retrievalService.indexChunks(chunks);
  });

  it('should stream grounded answer tokens with Attribution metadata event', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/chat')
      .send({
        query: 'What is the attention equation in methodology?',
        paperId: samplePaper.id,
      })
      .expect(200);

    expect(response.headers['content-type']).toContain('text/event-stream');

    const rawText = response.text;
    expect(rawText).toContain('data:');

    // Parse SSE lines
    const lines = rawText.split('\n\n').filter((l) => l.startsWith('data:'));
    const payloads = lines
      .map((l) => l.replace(/^data:\s*/, ''))
      .filter((l) => l !== '[DONE]')
      .map((l) => JSON.parse(l));

    // Must emit tokens
    const tokens = payloads.filter((p) => p.token).map((p) => p.token);
    expect(tokens.length).toBeGreaterThan(0);

    // Must emit attribution events with provenance (pageNumber, sectionTitle, paperId)
    const attributions = payloads.filter((p) => p.attributions).flatMap((p) => p.attributions);
    expect(attributions.length).toBeGreaterThan(0);

    const methAttribution = attributions.find((a: any) => a.sectionTitle === 'Methodology');
    expect(methAttribution).toBeDefined();
    expect(methAttribution.pageNumber).toBe(3);
    expect(methAttribution.paperId).toBe(samplePaper.id);
  });

  it('should state insufficient evidence when query cannot be answered from retrieved chunks', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/chat')
      .send({
        query: 'What is the speed of light in vacuum according to this paper?',
        paperId: samplePaper.id,
      })
      .expect(200);

    const rawText = response.text;
    const lines = rawText.split('\n\n').filter((l) => l.startsWith('data:'));
    const payloads = lines
      .map((l) => l.replace(/^data:\s*/, ''))
      .filter((l) => l !== '[DONE]')
      .map((l) => JSON.parse(l));

    const fullResponse = payloads.filter((p) => p.token).map((p) => p.token).join('');
    expect(
      fullResponse.toLowerCase().includes('insufficient evidence') ||
      fullResponse.toLowerCase().includes('does not contain') ||
      fullResponse.toLowerCase().includes('not mentioned')
    ).toBe(true);
  });

  describe('Cross-Paper Comparative Synthesis Seam (Ticket 05)', () => {
    it('should stream comparative synthesis across multiple papers in a Collection with multi-paper attributions', async () => {
      const { collectionStore } = await import('./services/collectionStore.js');
      const app = createApp();

      const paper1: Paper = {
        id: 'paper-comp-transformer',
        title: 'Transformer Translation',
        authors: ['Vaswani'],
        pageCount: 5,
        filePath: '/tmp/p1.pdf',
        createdAt: new Date().toISOString(),
      };
      const paper2: Paper = {
        id: 'paper-comp-bert',
        title: 'BERT Language Model',
        authors: ['Devlin'],
        pageCount: 8,
        filePath: '/tmp/p2.pdf',
        createdAt: new Date().toISOString(),
      };
      const paperUnrelated: Paper = {
        id: 'paper-unrelated',
        title: 'Unrelated Paper',
        authors: ['Anonymous'],
        pageCount: 3,
        filePath: '/tmp/p3.pdf',
        createdAt: new Date().toISOString(),
      };

      const md1 = `# Transformer Translation
## Architecture & Results
[PAGE 2]
The Transformer translation model reaches a benchmark score of 28.4 BLEU using multi-head attention.`;
      const md2 = `# BERT Language Model
## Architecture & Results
[PAGE 4]
The BERT language model achieves a benchmark score of 80.5 GLUE using masked bidirectional pre-training.`;
      const mdUnrelated = `# Unrelated
## Architecture & Results
Architecture benchmark score benchmark score benchmark score.`;

      await retrievalService.indexChunks([
        ...chunkPaperBySections(paper1, md1),
        ...chunkPaperBySections(paper2, md2),
        ...chunkPaperBySections(paperUnrelated, mdUnrelated),
      ]);

      const collection = collectionStore.createCollection({
        name: 'NLP Benchmarks Collection',
        paperIds: [paper1.id, paper2.id],
      });

      const response = await request(app)
        .post('/api/chat')
        .send({
          query: 'Compare the architecture and benchmark score of Transformer vs BERT',
          collectionId: collection.id,
        })
        .expect(200);

      const rawText = response.text;
      const lines = rawText.split('\n\n').filter((l) => l.startsWith('data:'));
      const payloads = lines
        .map((l) => l.replace(/^data:\s*/, ''))
        .filter((l) => l !== '[DONE]')
        .map((l) => JSON.parse(l));

      const attributions = payloads.filter((p) => p.attributions).flatMap((p) => p.attributions);
      const citedPaperIds = new Set(attributions.map((a: any) => a.paperId));

      // Must cite BOTH papers in the collection
      expect(citedPaperIds.has(paper1.id)).toBe(true);
      expect(citedPaperIds.has(paper2.id)).toBe(true);
      // Must NOT cite unrelated paper outside the collection
      expect(citedPaperIds.has(paperUnrelated.id)).toBe(false);

      const fullResponse = payloads.filter((p) => p.token).map((p) => p.token).join('');
      expect(fullResponse.length).toBeGreaterThan(0);
    });
  });

  describe('Agentic Tool Routing & Provenance Streaming (Ticket 06)', () => {
    it('streams tool notification and attributions with arxiv sourceType for external queries', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/api/chat')
        .send({
          query: 'Search arXiv for recent quantum neural network preprints',
        })
        .expect(200);

      const rawText = response.text;
      const lines = rawText.split('\n\n').filter((l) => l.startsWith('data:'));
      const payloads = lines
        .map((l) => l.replace(/^data:\s*/, ''))
        .filter((l) => l !== '[DONE]')
        .map((l) => JSON.parse(l));

      const toolPayload = payloads.find((p) => p.tool);
      expect(toolPayload).toBeDefined();
      expect(toolPayload.tool).toBe('search_arxiv');

      const attributions = payloads.filter((p) => p.attributions).flatMap((p) => p.attributions);
      expect(attributions.length).toBeGreaterThan(0);
      expect(attributions[0].sourceType).toBe('arxiv');
    });

    it('streams search_uploaded_papers tool and uploaded_paper sourceType for paper queries', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/api/chat')
        .send({
          query: 'What is the attention equation in methodology?',
          paperId: samplePaper.id,
        })
        .expect(200);

      const rawText = response.text;
      const lines = rawText.split('\n\n').filter((l) => l.startsWith('data:'));
      const payloads = lines
        .map((l) => l.replace(/^data:\s*/, ''))
        .filter((l) => l !== '[DONE]')
        .map((l) => JSON.parse(l));

      const toolPayload = payloads.find((p) => p.tool);
      expect(toolPayload).toBeDefined();
      expect(toolPayload.tool).toBe('search_uploaded_papers');

      const attributions = payloads.filter((p) => p.attributions).flatMap((p) => p.attributions);
      expect(attributions.length).toBeGreaterThan(0);
      expect(attributions[0].sourceType).toBe('uploaded_paper');
    });
  });
});
