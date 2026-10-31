import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { chunkPaperBySections, retrievalService } from './services/retrieval.js';
import { Paper } from '@research-qna/types';

describe('Retrieval & Indexing Seam (Ticket 03)', () => {
  const samplePaper: Paper = {
    id: 'paper-attention-test',
    title: 'Attention Is All You Need',
    authors: ['Vaswani et al.'],
    year: 2017,
    pageCount: 2,
    filePath: '/tmp/sample.pdf',
    createdAt: new Date().toISOString(),
  };

  const sampleMarkdown = `# Attention Is All You Need

## Abstract
[PAGE 1]
We propose the Transformer, a model architecture eschewing recurrence and relying entirely on an attention mechanism to draw global dependencies.

## Methodology
The Transformer uses stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. Multi-head attention allows the model to jointly attend to information from different representation subspaces.
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

## Results
[PAGE 2]
On the WMT 2014 English-to-German translation task, the big transformer model achieves a BLEU score of 28.4.
`;

  it('should chunk markdown strictly along structural section boundaries with provenance metadata', () => {
    const chunks = chunkPaperBySections(samplePaper, sampleMarkdown);

    expect(chunks.length).toBeGreaterThanOrEqual(3);

    // Verify metadata completeness on every Evidence Chunk (AGENTS.md rule)
    for (const chunk of chunks) {
      expect(chunk.id).toBeTruthy();
      expect(chunk.paperId).toBe(samplePaper.id);
      expect(chunk.paperTitle).toBe(samplePaper.title);
      expect(chunk.sectionTitle).toBeTruthy();
      expect(chunk.pageNumber).toBeGreaterThanOrEqual(1);
      expect(typeof chunk.chunkIndex).toBe('number');
      expect(chunk.content.trim().length).toBeGreaterThan(0);
    }

    // Verify sections identified
    const sectionTitles = chunks.map((c) => c.sectionTitle);
    expect(sectionTitles).toContain('Abstract');
    expect(sectionTitles).toContain('Methodology');
    expect(sectionTitles).toContain('Results');

    // Verify page numbers are accurately tracked
    const resultsChunk = chunks.find((c) => c.sectionTitle === 'Results');
    expect(resultsChunk?.pageNumber).toBe(2);
  });

  it('should index and retrieve candidate chunks via POST /api/search', async () => {
    const app = createApp();

    // Index sample chunks into retrieval service
    const chunks = chunkPaperBySections(samplePaper, sampleMarkdown);
    await retrievalService.indexChunks(chunks);

    // Query for specific methodology
    const response = await request(app)
      .post('/api/search')
      .send({
        query: 'What is the attention formula in methodology?',
        paperId: samplePaper.id,
      })
      .expect(200);

    expect(response.body).toHaveProperty('results');
    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results.length).toBeGreaterThan(0);

    const topResult = response.body.results[0];
    expect(topResult.paperId).toBe(samplePaper.id);
    expect(topResult.sectionTitle).toBe('Methodology');
    expect(topResult.content).toContain('softmax');
  });

  it('should return 400 when query is missing in /api/search', async () => {
    const app = createApp();

    await request(app)
      .post('/api/search')
      .send({})
      .expect(400);
  });

  describe('Partitioned Cross-Paper Retrieval Seam (Ticket 05)', () => {
    const paperA: Paper = {
      id: 'paper-a-transformer',
      title: 'Attention Is All You Need',
      authors: ['Vaswani et al.'],
      year: 2017,
      pageCount: 1,
      filePath: '/tmp/paper-a.pdf',
      createdAt: new Date().toISOString(),
    };

    const paperB: Paper = {
      id: 'paper-b-bert',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: ['Devlin et al.'],
      year: 2018,
      pageCount: 1,
      filePath: '/tmp/paper-b.pdf',
      createdAt: new Date().toISOString(),
    };

    const paperAMarkdown = `# Attention Is All You Need
## Architecture & Benchmark
The Transformer model architecture relies on multi-head attention mechanisms and self-attention layers. On benchmark translation tasks it reaches state-of-the-art accuracy.`;

    const paperBMarkdown = `# BERT: Pre-training of Deep Bidirectional Transformers
## Architecture & Benchmark
The BERT model architecture uses bidirectional representations from unlabeled text. On GLUE benchmark evaluation it establishes superior accuracy.`;

    it('should balance chunk representation across all papers using searchPartitioned', async () => {
      const chunksA = chunkPaperBySections(paperA, paperAMarkdown);
      const chunksB = chunkPaperBySections(paperB, paperBMarkdown);
      await retrievalService.indexChunks([...chunksA, ...chunksB]);

      const results = await retrievalService.searchPartitioned(
        'What are the architecture mechanisms and benchmark evaluations?',
        [paperA.id, paperB.id],
        2
      );

      const returnedPaperIds = new Set(results.map((r) => r.paperId));
      expect(returnedPaperIds.has(paperA.id)).toBe(true);
      expect(returnedPaperIds.has(paperB.id)).toBe(true);

      const paperACount = results.filter((r) => r.paperId === paperA.id).length;
      const paperBCount = results.filter((r) => r.paperId === paperB.id).length;
      expect(paperACount).toBeGreaterThanOrEqual(1);
      expect(paperBCount).toBeGreaterThanOrEqual(1);
    });
  });
});
