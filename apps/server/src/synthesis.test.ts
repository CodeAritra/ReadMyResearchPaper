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
});
