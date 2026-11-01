/**
 * Shared domain types for Research Paper Q&A.
 * Follows canonical definitions in GLOSSARY.md.
 */

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  filePath: string;
  pageCount: number;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  paperIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  title: string;
  pageNumber: number;
  startOffset?: number;
}

export interface EvidenceChunk {
  id: string;
  paperId: string;
  paperTitle: string;
  sectionTitle: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  score?: number;
}

export type SourceProvenance = 'uploaded_paper' | 'arxiv' | 'web';

export interface Attribution {
  paperId: string;
  paperTitle: string;
  sectionTitle: string;
  pageNumber: number;
  snippet?: string;
  sourceType?: SourceProvenance;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  attributions?: Attribution[];
  createdAt: string;
}

export interface QueryRequest {
  query: string;
  collectionId?: string;
  paperId?: string;
  history?: Array<{
    role: MessageRole;
    content: string;
  }>;
}

export type JobStatus = 'pending' | 'uploading' | 'parsing' | 'extracting' | 'indexing' | 'completed' | 'failed';

export interface IngestionJob {
  jobId: string;
  paperId: string;
  status: JobStatus;
  progress: number;
  message?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpectedCitation {
  pageNumber: number;
  sectionTitle: string;
}

export type EvalFocusMetric = 'Faithfulness' | 'Citation Precision' | 'Context Relevance' | 'Answer Relevance';

export interface GoldenTestCase {
  id: string;
  paperId: string;
  query: string;
  referenceAnswer: string;
  expectedCitations: ExpectedCitation[];
  focusMetric: EvalFocusMetric;
  shouldAbstain?: boolean;
}

export interface MetricCritique {
  score: number; // 0.0 to 1.0
  reasoning: string;
}

export interface EvaluationResult {
  testId: string;
  query: string;
  faithfulness: MetricCritique;
  citationPrecision: MetricCritique;
  contextRelevance: MetricCritique;
  answerRelevance: MetricCritique;
  latencyMs: number;
  passed: boolean;
}
