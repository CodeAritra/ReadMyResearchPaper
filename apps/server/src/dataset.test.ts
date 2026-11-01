import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GoldenTestCase } from '@research-qna/types';

describe('Golden Evaluation Dataset Integrity (attention-golden.json)', () => {
  const datasetPath = path.resolve(process.cwd(), 'evals/datasets/attention-golden.json');

  it('loads valid JSON dataset file', () => {
    expect(fs.existsSync(datasetPath)).toBe(true);
    const content = fs.readFileSync(datasetPath, 'utf8');
    const testCases: GoldenTestCase[] = JSON.parse(content);
    expect(Array.isArray(testCases)).toBe(true);
    expect(testCases.length).toBeGreaterThanOrEqual(4);
  });

  it('verifies all test cases conform to the GoldenTestCase interface', () => {
    const content = fs.readFileSync(datasetPath, 'utf8');
    const testCases: GoldenTestCase[] = JSON.parse(content);

    for (const tc of testCases) {
      expect(tc.id).toBeDefined();
      expect(tc.paperId).toBe('paper-attention');
      expect(tc.query.length).toBeGreaterThan(10);
      expect(tc.referenceAnswer.length).toBeGreaterThan(15);
      expect(Array.isArray(tc.expectedCitations)).toBe(true);
      expect(tc.focusMetric).toBeDefined();

      if (tc.shouldAbstain) {
        expect(tc.expectedCitations.length).toBe(0);
      } else {
        expect(tc.expectedCitations.length).toBeGreaterThan(0);
        for (const citation of tc.expectedCitations) {
          expect(citation.pageNumber).toBeGreaterThan(0);
          expect(citation.sectionTitle.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
