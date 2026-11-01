import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleOnlineEvaluation } from './services/onlineEvaluator.js';

describe('Online Production Evaluation & LangSmith Feedback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('no-ops safely when runId is not provided', () => {
    process.env.LANGCHAIN_TRACING_V2 = 'true';
    process.env.LANGCHAIN_API_KEY = 'test_key';

    expect(() => {
      scheduleOnlineEvaluation({
        runId: undefined,
        query: 'What is attention?',
        answer: 'Attention is a mechanism.',
        evidenceChunks: [],
        attributions: [],
      });
    }).not.toThrow();
  });

  it('no-ops safely when LANGCHAIN_TRACING_V2 is false or API key is missing', () => {
    delete process.env.LANGCHAIN_TRACING_V2;
    delete process.env.LANGCHAIN_API_KEY;

    expect(() => {
      scheduleOnlineEvaluation({
        runId: 'dummy-run-id',
        query: 'What is attention?',
        answer: 'Attention is a mechanism.',
        evidenceChunks: [],
        attributions: [],
      });
    }).not.toThrow();
  });
});
