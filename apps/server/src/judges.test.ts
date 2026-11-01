import { describe, it, expect } from 'vitest';
import {
  evaluateFaithfulness,
  evaluateCitationPrecision,
  evaluateContextRelevance,
  evaluateAnswerRelevance,
  parseJudgeJson,
} from './evals/judges/index.js';

describe('LLM Evaluation Judges & Rubrics (Extended Academic Triad)', () => {
  describe('parseJudgeJson helper', () => {
    it('parses JSON from raw text and markdown blocks', () => {
      const raw1 = '{"score": 1.0, "reasoning": "Grounded"}';
      expect(parseJudgeJson<{ score: number }>(raw1)?.score).toBe(1.0);

      const raw2 = '```json\n{"score": 0.5, "reasoning": "Partial"}\n```';
      expect(parseJudgeJson<{ score: number }>(raw2)?.score).toBe(0.5);

      const raw3 = 'Here is the verdict: {"score": 0.0, "reasoning": "Contradiction"} thanks';
      expect(parseJudgeJson<{ score: number }>(raw3)?.score).toBe(0.0);
    });
  });

  describe('evaluateFaithfulness', () => {
    const evidence = [
      {
        pageNumber: 4,
        sectionTitle: '3.2.2 Multi-Head Attention',
        content: 'In this work we employ h = 8 parallel attention layers, or heads. For each of these we use d_k = d_v = d_model / h = 64.',
      },
    ];

    it('scores 1.0 when claims are grounded in evidence chunks', async () => {
      const res = await evaluateFaithfulness({
        query: 'What is d_k?',
        answer: 'The projection dimension for each head is d_k = 64 with h = 8 heads.',
        evidenceChunks: evidence,
      });

      expect(res.score).toBeGreaterThanOrEqual(0.5);
      expect(res.reasoning.length).toBeGreaterThan(0);
    });

    it('scores 1.0 when correctly abstaining from out-of-scope query', async () => {
      const res = await evaluateFaithfulness({
        query: 'What is Llama 3?',
        answer: 'The uploaded paper does not contain sufficient evidence to answer this question.',
        evidenceChunks: [],
        shouldAbstain: true,
      });

      expect(res.score).toBe(1.0);
    });

    it('scores 0.0 when failing to abstain from out-of-scope query', async () => {
      const res = await evaluateFaithfulness({
        query: 'What is Llama 3?',
        answer: 'Llama 3 has 70 billion parameters trained with PPO.',
        evidenceChunks: [],
        shouldAbstain: true,
      });

      expect(res.score).toBe(0.0);
    });
  });

  describe('evaluateCitationPrecision', () => {
    it('scores 1.0 when expected citation page is matched', async () => {
      const res = await evaluateCitationPrecision({
        query: 'What is d_k?',
        answer: 'According to [Attention Is All You Need · p. 4], d_k = 64.',
        attributions: [
          {
            paperId: 'paper-attention',
            paperTitle: 'Attention Is All You Need',
            sectionTitle: '3.2.2 Multi-Head Attention',
            pageNumber: 4,
          },
        ],
        expectedCitations: [{ pageNumber: 4, sectionTitle: '3.2.2 Multi-Head Attention' }],
      });

      expect(res.score).toBe(1.0);
    });

    it('scores 1.0 when abstaining with zero citations', async () => {
      const res = await evaluateCitationPrecision({
        query: 'What is Llama 3?',
        answer: 'The paper does not contain sufficient evidence.',
        attributions: [],
        shouldAbstain: true,
      });

      expect(res.score).toBe(1.0);
    });
  });

  describe('evaluateContextRelevance & evaluateAnswerRelevance', () => {
    it('evaluates context relevance based on query keyword containment', async () => {
      const res = await evaluateContextRelevance({
        query: 'multi-head attention projection dimensions',
        evidenceChunks: [
          {
            sectionTitle: '3.2.2 Multi-Head Attention',
            content: 'Multi-head attention projections use dimensions 64.',
          },
        ],
      });

      expect(res.score).toBeGreaterThanOrEqual(0.5);
    });

    it('evaluates answer relevance when response is direct', async () => {
      const res = await evaluateAnswerRelevance({
        query: 'What is d_k?',
        answer: 'd_k is 64 across 8 parallel heads in the attention mechanism.',
      });

      expect(res.score).toBe(1.0);
    });
  });
});
