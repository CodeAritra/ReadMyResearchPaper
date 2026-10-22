import { EvidenceChunk, Paper } from '@research-qna/types';
import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'crypto';

export function chunkPaperBySections(paper: Paper, markdown: string): EvidenceChunk[] {
  const lines = markdown.split('\n');
  const chunks: EvidenceChunk[] = [];

  let currentSection = 'Introduction';
  let currentPage = 1;
  let currentContent: string[] = [];
  let chunkIndex = 0;

  const flushChunk = () => {
    const text = currentContent.join('\n').trim();
    if (text.length > 0) {
      chunks.push({
        id: `chunk-${paper.id}-${chunkIndex}`,
        paperId: paper.id,
        paperTitle: paper.title,
        sectionTitle: currentSection,
        pageNumber: currentPage,
        chunkIndex,
        content: text,
      });
      chunkIndex++;
    }
    currentContent = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Track page transitions
    const pageMatch = trimmed.match(/\[PAGE\s+(\d+)\]/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      continue;
    }

    // Check for structural section headings
    if (trimmed.startsWith('#')) {
      flushChunk();
      currentSection = trimmed.replace(/^#+\s*/, '').trim() || 'General';
      continue;
    }

    currentContent.push(line);
  }

  flushChunk();

  if (chunks.length === 0) {
    chunks.push({
      id: `chunk-${paper.id}-0`,
      paperId: paper.id,
      paperTitle: paper.title,
      sectionTitle: 'Full Document',
      pageNumber: 1,
      chunkIndex: 0,
      content: markdown.trim(),
    });
  }

  return chunks;
}

export class RetrievalService {
  private indexedChunks: EvidenceChunk[] = [];
  private qdrantClient: QdrantClient | null = null;
  private qdrantCollection = 'research_paper_chunks';

  constructor() {
    if (process.env.QDRANT_URL) {
      try {
        this.qdrantClient = new QdrantClient({
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
        });
      } catch (err) {
        console.warn('[RetrievalService] Failed to initialize QdrantClient:', err);
      }
    }
  }

  async indexChunks(chunks: EvidenceChunk[]): Promise<void> {
    // Deduplicate / replace existing chunks for same paper
    const paperIds = new Set(chunks.map((c) => c.paperId));
    this.indexedChunks = this.indexedChunks.filter((c) => !paperIds.has(c.paperId));
    this.indexedChunks.push(...chunks);
  }

  async search(
    query: string,
    options?: { paperId?: string; limit?: number }
  ): Promise<EvidenceChunk[]> {
    const limit = options?.limit ?? 5;
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    let candidates = this.indexedChunks;
    if (options?.paperId) {
      candidates = candidates.filter((c) => c.paperId === options.paperId);
    }

    // Two-stage scoring: BM25-style term frequency + section title boost
    const scored = candidates.map((chunk) => {
      let score = 0;
      const contentLower = chunk.content.toLowerCase();
      const sectionLower = chunk.sectionTitle.toLowerCase();

      for (const token of queryTokens) {
        // Count token occurrences in content
        const regex = new RegExp(`\\b${token}\\b`, 'gi');
        const matches = contentLower.match(regex);
        if (matches) {
          score += matches.length * 2;
        } else if (contentLower.includes(token)) {
          score += 1;
        }

        // Section header match is a strong signal
        if (sectionLower.includes(token)) {
          score += 5;
        }
      }

      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => ({
      ...s.chunk,
      score: s.score,
    }));
  }

  getChunksForPaper(paperId: string): EvidenceChunk[] {
    return this.indexedChunks.filter((c) => c.paperId === paperId);
  }
}

export const retrievalService = new RetrievalService();
