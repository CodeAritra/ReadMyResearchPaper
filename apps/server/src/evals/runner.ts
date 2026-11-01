import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoldenTestCase, EvaluationResult } from '@research-qna/types';
import { withEvalProject, getTracingStatus } from '../services/observability.js';
import { seedAttentionPaper } from '../services/seedPaper.js';
import { generateGroundedSynthesis } from '../services/synthesis.js';
import {
  evaluateFaithfulness,
  evaluateCitationPrecision,
  evaluateContextRelevance,
  evaluateAnswerRelevance,
} from './judges/index.js';

// Multi-path dotenv resolution
dotenv.config();
try {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(currentDir, '../../.env') });
  dotenv.config({ path: path.resolve(currentDir, '../../../../.env') });
} catch {
  // Ignore fallback resolution errors
}

// Configurable Evaluation Quality Thresholds
export const EVAL_THRESHOLDS = {
  MIN_FAITHFULNESS: 0.85,
  MIN_CITATION_PRECISION: 0.90,
  MIN_ANSWER_RELEVANCE: 0.80,
  MIN_CONTEXT_RELEVANCE: 0.75,
};

export async function runEvaluationSuite(options?: {
  datasetPath?: string;
  enforceThresholds?: boolean;
}): Promise<{
  results: EvaluationResult[];
  averages: {
    faithfulness: number;
    citationPrecision: number;
    contextRelevance: number;
    answerRelevance: number;
  };
  passed: boolean;
}> {
  const enforce = options?.enforceThresholds ?? true;
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultDataset = path.resolve(currentDir, '../../evals/datasets/attention-golden.json');
  const datasetFile = options?.datasetPath || defaultDataset;

  if (!fs.existsSync(datasetFile)) {
    throw new Error(`Golden dataset file not found at: ${datasetFile}`);
  }

  const raw = fs.readFileSync(datasetFile, 'utf8');
  const testCases: GoldenTestCase[] = JSON.parse(raw);

  console.log('\n======================================================');
  console.log('  RESEARCH PAPER Q&A: EVALUATION & OBSERVABILITY RUNNER');
  console.log('======================================================');

  const tracing = getTracingStatus();
  console.log(`[Observability] LangSmith Tracing Active: ${tracing.enabled ? 'YES' : 'NO (Offline/Local)'}`);
  console.log(`[Observability] Active Evaluation Project: research-paper-qna-evals`);
  console.log(`[Dataset] Loaded ${testCases.length} benchmark test cases from ${path.basename(datasetFile)}\n`);

  // Ensure canonical manuscript is indexed
  console.log('[Setup] Verifying seeded manuscript in vector store...');
  await seedAttentionPaper();

  const results: EvaluationResult[] = [];

  // Run inside isolated LangSmith evaluation project
  await withEvalProject(async () => {
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      console.log(`[Run ${i + 1}/${testCases.length}] Evaluating "${tc.id}"...`);
      const startTime = Date.now();

      // Execute grounded RAG synthesis
      const response = await generateGroundedSynthesis({
        query: tc.query,
        paperId: tc.paperId,
      });

      const latencyMs = Date.now() - startTime;

      // Run judges across the Extended Academic Triad
      const [faithfulness, citationPrecision, contextRelevance, answerRelevance] =
        await Promise.all([
          evaluateFaithfulness({
            query: tc.query,
            answer: response.text,
            evidenceChunks: response.relevantChunks,
            shouldAbstain: tc.shouldAbstain,
          }),
          evaluateCitationPrecision({
            query: tc.query,
            answer: response.text,
            attributions: response.attributions,
            expectedCitations: tc.expectedCitations,
            shouldAbstain: tc.shouldAbstain,
          }),
          evaluateContextRelevance({
            query: tc.query,
            evidenceChunks: response.relevantChunks,
          }),
          evaluateAnswerRelevance({
            query: tc.query,
            answer: response.text,
            referenceAnswer: tc.referenceAnswer,
            shouldAbstain: tc.shouldAbstain,
          }),
        ]);

      // Determine test case success
      const testPassed =
        faithfulness.score >= 0.8 &&
        citationPrecision.score >= 0.8 &&
        answerRelevance.score >= 0.5;

      results.push({
        testId: tc.id,
        query: tc.query,
        faithfulness,
        citationPrecision,
        contextRelevance,
        answerRelevance,
        latencyMs,
        passed: testPassed,
      });
    }
  });

  // Calculate Averages
  const total = results.length;
  const avgFaithfulness = results.reduce((acc, r) => acc + r.faithfulness.score, 0) / total;
  const avgCitationPrecision = results.reduce((acc, r) => acc + r.citationPrecision.score, 0) / total;
  const avgContextRelevance = results.reduce((acc, r) => acc + r.contextRelevance.score, 0) / total;
  const avgAnswerRelevance = results.reduce((acc, r) => acc + r.answerRelevance.score, 0) / total;

  // Print Summary Table
  console.log('\n--- EVALUATION RESULTS SUMMARY ---');
  console.table(
    results.map((r) => ({
      'Test ID': r.testId,
      Faithfulness: r.faithfulness.score.toFixed(2),
      'Citation Prec': r.citationPrecision.score.toFixed(2),
      'Context Rel': r.contextRelevance.score.toFixed(2),
      'Answer Rel': r.answerRelevance.score.toFixed(2),
      Latency: `${r.latencyMs}ms`,
      Status: r.passed ? '✓ PASS' : '✗ FAIL',
    }))
  );

  console.log('\n--- AGGREGATE METRICS & GATING THRESHOLDS ---');
  console.log(
    `Faithfulness:        ${avgFaithfulness.toFixed(3)}  (Threshold: ${EVAL_THRESHOLDS.MIN_FAITHFULNESS})  -> ${
      avgFaithfulness >= EVAL_THRESHOLDS.MIN_FAITHFULNESS ? 'PASS' : 'FAIL'
    }`
  );
  console.log(
    `Citation Precision:  ${avgCitationPrecision.toFixed(3)}  (Threshold: ${EVAL_THRESHOLDS.MIN_CITATION_PRECISION})  -> ${
      avgCitationPrecision >= EVAL_THRESHOLDS.MIN_CITATION_PRECISION ? 'PASS' : 'FAIL'
    }`
  );
  console.log(
    `Context Relevance:   ${avgContextRelevance.toFixed(3)}  (Threshold: ${EVAL_THRESHOLDS.MIN_CONTEXT_RELEVANCE})  -> ${
      avgContextRelevance >= EVAL_THRESHOLDS.MIN_CONTEXT_RELEVANCE ? 'PASS' : 'FAIL'
    }`
  );
  console.log(
    `Answer Relevance:    ${avgAnswerRelevance.toFixed(3)}  (Threshold: ${EVAL_THRESHOLDS.MIN_ANSWER_RELEVANCE})  -> ${
      avgAnswerRelevance >= EVAL_THRESHOLDS.MIN_ANSWER_RELEVANCE ? 'PASS' : 'FAIL'
    }`
  );

  const passedGating =
    !enforce ||
    (avgFaithfulness >= EVAL_THRESHOLDS.MIN_FAITHFULNESS &&
      avgCitationPrecision >= EVAL_THRESHOLDS.MIN_CITATION_PRECISION &&
      avgAnswerRelevance >= EVAL_THRESHOLDS.MIN_ANSWER_RELEVANCE);

  if (passedGating) {
    console.log('\n🎉 ALL QUALITY GATING THRESHOLDS SATISFIED. Ready for release.');
  } else {
    console.error('\n❌ EVALUATION REGRESSION DETECTED: One or more metrics fell below required thresholds.');
  }

  return {
    results,
    averages: {
      faithfulness: avgFaithfulness,
      citationPrecision: avgCitationPrecision,
      contextRelevance: avgContextRelevance,
      answerRelevance: avgAnswerRelevance,
    },
    passed: passedGating,
  };
}

// Direct CLI entry point
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runEvaluationSuite()
    .then((summary) => {
      process.exit(summary.passed ? 0 : 1);
    })
    .catch((err) => {
      console.error('[EvalRunner] Fatal error:', err);
      process.exit(1);
    });
}
