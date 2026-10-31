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
      if (text.length > 2500) {
        const paragraphs = text.split(/\n\s*\n/);
        let subBuffer: string[] = [];
        let subLen = 0;
        for (const para of paragraphs) {
          if (subLen + para.length > 2000 && subBuffer.length > 0) {
            chunks.push({
              id: `chunk-${paper.id}-${chunkIndex++}`,
              paperId: paper.id,
              paperTitle: paper.title,
              sectionTitle: currentSection,
              pageNumber: currentPage,
              chunkIndex,
              content: subBuffer.join('\n\n').trim(),
            });
            subBuffer = [];
            subLen = 0;
          }
          subBuffer.push(para);
          subLen += para.length;
        }
        if (subBuffer.length > 0) {
          chunks.push({
            id: `chunk-${paper.id}-${chunkIndex++}`,
            paperId: paper.id,
            paperTitle: paper.title,
            sectionTitle: currentSection,
            pageNumber: currentPage,
            chunkIndex,
            content: subBuffer.join('\n\n').trim(),
          });
        }
      } else {
        chunks.push({
          id: `chunk-${paper.id}-${chunkIndex++}`,
          paperId: paper.id,
          paperTitle: paper.title,
          sectionTitle: currentSection,
          pageNumber: currentPage,
          chunkIndex,
          content: text,
        });
      }
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
  private collectionInitialized = false;

  constructor() {
    this.getQdrantClient();
  }

  private getQdrantClient(): QdrantClient | null {
    if (!this.qdrantClient && process.env.QDRANT_URL) {
      try {
        this.qdrantClient = new QdrantClient({
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
          checkCompatibility: false,
        });
      } catch (err) {
        console.warn('[RetrievalService] Failed to initialize QdrantClient:', err);
      }
    }
    return this.qdrantClient;
  }

  private async ensureQdrantCollection(): Promise<void> {
    const client = this.getQdrantClient();
    if (!client || this.collectionInitialized) return;
    try {
      const exists = await client.collectionExists(this.qdrantCollection);
      if (!exists.exists) {
        await client.createCollection(this.qdrantCollection, {
          vectors: {
            size: 3072,
            distance: 'Cosine',
          },
        });
      }

      // Ensure keyword payload indexes for exact filtering and deduplication
      try {
        await client.createPayloadIndex(this.qdrantCollection, {
          field_name: 'paperId',
          field_schema: 'keyword',
          wait: true,
        });
        await client.createPayloadIndex(this.qdrantCollection, {
          field_name: 'paperTitle',
          field_schema: 'keyword',
          wait: true,
        });
      } catch {
        // Indexes may already exist
      }

      this.collectionInitialized = true;
    } catch (err) {
      console.warn('[RetrievalService] Could not ensure Qdrant collection:', err);
    }
  }

  private generateDeterministicPointId(paperId: string, chunkIndex: number): string {
    const hash = crypto.createHash('md5').update(`${paperId}:${chunkIndex}`).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  async indexChunks(chunks: EvidenceChunk[]): Promise<void> {
    // 1. Maintain local in-memory candidate store
    const paperIds = new Set(chunks.map((c) => c.paperId));
    this.indexedChunks = this.indexedChunks.filter((c) => !paperIds.has(c.paperId));
    this.indexedChunks.push(...chunks);

    // 2. Index into Qdrant Cloud when credentials are available
    const client = this.getQdrantClient();
    const apiKey = process.env.GEMINI_API_KEY;

    if (client && apiKey && chunks.length > 0) {
      try {
        await this.ensureQdrantCollection();
        const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai');
        const embeddings = new GoogleGenerativeAIEmbeddings({
          apiKey,
          model: 'gemini-embedding-001',
        });

        // Deduplication: Remove any pre-existing points for this paperId before upserting
        const targetPaperId = chunks[0]?.paperId;
        if (targetPaperId) {
          try {
            await client.delete(this.qdrantCollection, {
              wait: true,
              filter: {
                must: [{ key: 'paperId', match: { value: targetPaperId } }],
              },
            });
          } catch {
            // Ignore if no points matched
          }
        }

        // Batch embed chunks
        const texts = chunks.map((c) => `${c.paperTitle} - ${c.sectionTitle}\n${c.content}`);
        const vectors = await embeddings.embedDocuments(texts);

        const points = chunks.map((chunk, idx) => ({
          id: this.generateDeterministicPointId(chunk.paperId, chunk.chunkIndex),
          vector: vectors[idx],
          payload: {
            paperId: chunk.paperId,
            paperTitle: chunk.paperTitle,
            sectionTitle: chunk.sectionTitle,
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
          },
        }));

        // Upsert in batches of 50
        const batchSize = 50;
        for (let i = 0; i < points.length; i += batchSize) {
          const batch = points.slice(i, i + batchSize);
          await client.upsert(this.qdrantCollection, {
            wait: true,
            points: batch,
          });
        }
        console.log(`[RetrievalService] Indexed ${points.length} chunks for "${chunks[0]?.paperTitle}" into Qdrant Cloud collection "${this.qdrantCollection}"`);
      } catch (err) {
        console.warn('[RetrievalService] Qdrant Cloud indexing failed, relying on local index:', err);
      }
    }
  }

  async search(
    query: string,
    options?: { paperId?: string; limit?: number }
  ): Promise<EvidenceChunk[]> {
    const limit = options?.limit ?? 5;

    // 1. Attempt vector search via Qdrant Cloud if available
    const client = this.getQdrantClient();
    const apiKey = process.env.GEMINI_API_KEY;

    if (client && apiKey) {
      try {
        await this.ensureQdrantCollection();
        const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai');
        const embeddings = new GoogleGenerativeAIEmbeddings({
          apiKey,
          model: 'gemini-embedding-001',
        });

        const queryVec = await embeddings.embedQuery(query);
        const filter = options?.paperId
          ? {
              must: [
                {
                  key: 'paperId',
                  match: { value: options.paperId },
                },
              ],
            }
          : undefined;

        const res = await client.query(this.qdrantCollection, {
          query: queryVec,
          filter,
          limit,
          with_payload: true,
        });

        if (res.points && res.points.length > 0) {
          const qdrantResults: EvidenceChunk[] = res.points.map((pt) => {
            const p = (pt.payload || {}) as any;
            return {
              id: String(pt.id),
              paperId: p.paperId || '',
              paperTitle: p.paperTitle || '',
              sectionTitle: p.sectionTitle || '',
              pageNumber: p.pageNumber || 1,
              chunkIndex: p.chunkIndex || 0,
              content: p.content || '',
              score: pt.score ?? 0,
            };
          });
          return qdrantResults;
        }
      } catch (err) {
        console.warn('[RetrievalService] Qdrant search failed, falling back to local hybrid search:', err);
      }
    }

    // 2. Local fallback BM25 keyword search
    const stopWords = new Set([
      'what', 'is', 'the', 'in', 'of', 'and', 'to', 'a', 'an', 'for', 'on', 'with', 'as',
      'by', 'at', 'from', 'this', 'that', 'these', 'those', 'it', 'its', 'paper', 'according',
      'does', 'did', 'do', 'can', 'could', 'how', 'why', 'when', 'where', 'which', 'who'
    ]);

    const queryTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t));

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

  async searchPartitioned(
    query: string,
    paperIds: string[],
    limitPerPaper = 2
  ): Promise<EvidenceChunk[]> {
    if (!paperIds || paperIds.length === 0) {
      return this.search(query, { limit: limitPerPaper * 2 });
    }

    const perPaperPromises = paperIds.map((paperId) =>
      this.search(query, { paperId, limit: limitPerPaper })
    );

    const paperResults = await Promise.all(perPaperPromises);
    const combined: EvidenceChunk[] = [];

    // Interleave chunks from each paper to guarantee balanced representation across papers
    const maxLen = Math.max(...paperResults.map((r) => r.length), 0);
    for (let i = 0; i < maxLen; i++) {
      for (const res of paperResults) {
        if (i < res.length) {
          combined.push(res[i]);
        }
      }
    }

    return combined;
  }

  getChunksForPaper(paperId: string): EvidenceChunk[] {
    return this.indexedChunks.filter((c) => c.paperId === paperId);
  }

  async getStats(): Promise<{
    collection: string;
    totalPoints: number;
    totalPdfs: number;
    papers: Array<{ paperId: string; paperTitle: string; chunks: number }>;
  }> {
    const client = this.getQdrantClient();
    if (!client) {
      const distinctPaperIds = Array.from(new Set(this.indexedChunks.map((c) => c.paperId)));
      return {
        collection: 'local_in_memory',
        totalPoints: this.indexedChunks.length,
        totalPdfs: distinctPaperIds.length,
        papers: distinctPaperIds.map((pid) => {
          const matching = this.indexedChunks.filter((c) => c.paperId === pid);
          return {
            paperId: pid,
            paperTitle: matching[0]?.paperTitle || 'Unknown',
            chunks: matching.length,
          };
        }),
      };
    }

    try {
      await this.ensureQdrantCollection();
      const info = await client.getCollection(this.qdrantCollection);
      const scroll = await client.scroll(this.qdrantCollection, {
        limit: 1000,
        with_payload: true,
      });

      const paperMap = new Map<string, { paperId: string; paperTitle: string; chunks: number }>();
      for (const pt of scroll.points) {
        const p = (pt.payload || {}) as any;
        const pid = p.paperId || 'unknown';
        if (!paperMap.has(pid)) {
          paperMap.set(pid, {
            paperId: pid,
            paperTitle: p.paperTitle || 'Unknown',
            chunks: 0,
          });
        }
        paperMap.get(pid)!.chunks++;
      }

      return {
        collection: this.qdrantCollection,
        totalPoints: info.points_count ?? scroll.points.length,
        totalPdfs: paperMap.size,
        papers: Array.from(paperMap.values()),
      };
    } catch (err: any) {
      console.warn('[RetrievalService] Failed to fetch Qdrant stats:', err);
      return {
        collection: this.qdrantCollection,
        totalPoints: 0,
        totalPdfs: 0,
        papers: [],
      };
    }
  }
}

export const retrievalService = new RetrievalService();
