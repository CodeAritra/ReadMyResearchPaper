import { describe, it, expect } from 'vitest';
import { runEvaluationSuite, EVAL_THRESHOLDS } from './evals/runner.js';

describe('Automated Evaluation Suite Runner (Ticket 11)', () => {
  it('defines quality gating thresholds', () => {
    expect(EVAL_THRESHOLDS.MIN_FAITHFULNESS).toBe(0.85);
    expect(EVAL_THRESHOLDS.MIN_CITATION_PRECISION).toBe(0.90);
    expect(EVAL_THRESHOLDS.MIN_ANSWER_RELEVANCE).toBe(0.80);
  });

  it('executes golden evaluation suite and produces scored metrics', async () => {
    const summary = await runEvaluationSuite({ enforceThresholds: false });

    expect(summary.results.length).toBeGreaterThanOrEqual(4);
    for (const r of summary.results) {
      expect(r.faithfulness.score).toBeGreaterThanOrEqual(0);
      expect(r.citationPrecision.score).toBeGreaterThanOrEqual(0);
      expect(r.contextRelevance.score).toBeGreaterThanOrEqual(0);
      expect(r.answerRelevance.score).toBeGreaterThanOrEqual(0);
      expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    }

    expect(summary.averages.faithfulness).toBeGreaterThan(0);
    expect(summary.averages.citationPrecision).toBeGreaterThan(0);
  }, 30000);
});
