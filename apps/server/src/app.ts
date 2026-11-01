import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { QueryRequest, EvidenceChunk } from '@research-qna/types';
import { jobManager } from './services/jobManager.js';
import { paperStore } from './services/paperStore.js';
import { collectionStore } from './services/collectionStore.js';
import { extractDocumentStructure } from './services/extraction.js';
import { chunkPaperBySections, retrievalService } from './services/retrieval.js';
import { streamGroundedSynthesis } from './services/synthesis.js';
import { seedAttentionPaper } from './services/seedPaper.js';
import { getTracingStatus, initializeTracing } from './services/observability.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are supported'));
    }
  },
});

export function createApp(): express.Application {
  initializeTracing();
  const app = express();

  // Seed actual Attention Is All You Need paper & index chunks
  seedAttentionPaper();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'research-qna-server' });
  });

  // Paper Upload Endpoint (Asynchronous Ingestion)
  app.post(
    '/api/papers/upload',
    upload.single('file'),
    (req: Request, res: Response): void => {
      if (!req.file) {
        res.status(400).json({ error: 'PDF file is required under "file" field' });
        return;
      }

      const filePath = req.file.path;
      const originalFilename = req.file.originalname;

      // Compute SHA-256 fingerprint for instant byte-level deduplication
      let fileHash = '';
      try {
        const fileBuffer = fs.readFileSync(filePath);
        fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      } catch (hashErr) {
        console.warn('[Upload] Could not compute file hash:', hashErr);
      }

      // Check if this identical file has already been uploaded & indexed
      const existingPaper = fileHash ? paperStore.findByHash(fileHash) : undefined;
      if (existingPaper) {
        // Clean up redundant uploaded file from disk
        try {
          fs.unlinkSync(filePath);
        } catch {}

        const job = jobManager.createJob(existingPaper.id);
        jobManager.updateJob(job.jobId, {
          status: 'completed',
          progress: 100,
          message: `Paper "${existingPaper.title}" is already uploaded and indexed. Reusing existing vector index.`,
        });

        res.status(200).json({
          jobId: job.jobId,
          paperId: existingPaper.id,
          status: 'completed',
          message: 'Document already indexed. Reusing existing vector index.',
          duplicate: true,
        });
        return;
      }

      const paperId = `paper-${crypto.randomUUID()}`;
      const job = jobManager.createJob(paperId);

      res.status(202).json({
        jobId: job.jobId,
        paperId,
        status: job.status,
        message: 'PDF upload accepted for asynchronous extraction',
      });

      // Dispatch background async extraction worker
      (async () => {
        try {
          jobManager.updateJob(job.jobId, { status: 'parsing', progress: 20 });
          const extracted = await extractDocumentStructure(filePath, originalFilename);

          // Deduplication by extracted title (in case file bytes differed slightly)
          const existingByTitle = paperStore.findByTitle(extracted.title);
          if (existingByTitle) {
            try {
              fs.unlinkSync(filePath);
            } catch {}

            jobManager.updateJob(job.jobId, {
              paperId: existingByTitle.id,
              status: 'completed',
              progress: 100,
              message: `Paper "${existingByTitle.title}" is already indexed. Reusing existing vector index.`,
            });
            return;
          }

          jobManager.updateJob(job.jobId, { status: 'extracting', progress: 50 });

          const paper = {
            id: paperId,
            title: extracted.title,
            authors: extracted.authors,
            pageCount: extracted.pageCount,
            filePath,
            sections: extracted.sections,
            rawMarkdown: extracted.rawMarkdown,
            fileHash,
            createdAt: new Date().toISOString(),
          };

          // Persist paper metadata & extracted structure
          paperStore.savePaper(paper);

          // Chunk and index into retrieval service
          jobManager.updateJob(job.jobId, { status: 'indexing', progress: 80 });
          const chunks = chunkPaperBySections(paper, extracted.rawMarkdown);
          await retrievalService.indexChunks(chunks);

          jobManager.updateJob(job.jobId, {
            status: 'completed',
            progress: 100,
            message: 'Document extraction and indexing completed successfully',
          });
        } catch (err: any) {
          console.error('[Ingestion Worker] Error:', err);
          jobManager.updateJob(job.jobId, {
            status: 'failed',
            error: err?.message || 'Ingestion extraction failed',
          });
        }
      })();
    }
  );

  // Job Status Tracking Endpoint
  app.get('/api/jobs/:jobId', (req: Request, res: Response): void => {
    const job = jobManager.getJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(job);
  });

  // Paper Metadata Retrieval
  app.get('/api/papers/:paperId', (req: Request, res: Response): void => {
    const paper = paperStore.getPaper(req.params.paperId);
    if (!paper) {
      res.status(404).json({ error: 'Paper not found' });
      return;
    }
    res.json(paper);
  });

  // Raw PDF Document Streaming Endpoint
  app.get('/api/papers/:paperId/pdf', (req: Request, res: Response): void => {
    const paper = paperStore.getPaper(req.params.paperId);
    if (!paper) {
      res.status(404).json({ error: 'Paper not found' });
      return;
    }

    let filePath = paper.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      const fallbackPath = path.resolve(uploadDir, path.basename(filePath || ''));
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      } else if (paper.id === 'paper-attention') {
        const seedPath = path.resolve(uploadDir, 'attention-is-all-you-need.pdf');
        if (fs.existsSync(seedPath)) filePath = seedPath;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'PDF file not found on disk' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(paper.title)}.pdf"`
    );
    res.sendFile(path.resolve(filePath));
  });

  // List all indexed papers
  app.get('/api/papers', (_req: Request, res: Response): void => {
    res.json(paperStore.listPapers());
  });

  // Collection Management Endpoints
  app.post('/api/collections', (req: Request, res: Response): void => {
    const { name, description, paperIds } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Collection name is required and must be non-empty' });
      return;
    }

    const collection = collectionStore.createCollection({
      name,
      description,
      paperIds: Array.isArray(paperIds) ? paperIds : [],
    });

    res.status(201).json(collection);
  });

  app.get('/api/collections', (_req: Request, res: Response): void => {
    res.json(collectionStore.listCollections());
  });

  app.get('/api/collections/:id', (req: Request, res: Response): void => {
    const collection = collectionStore.getCollection(req.params.id);
    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    res.json(collection);
  });

  app.patch('/api/collections/:id', (req: Request, res: Response): void => {
    const { name, description, paperIds } = req.body || {};
    const updated = collectionStore.updateCollection(req.params.id, {
      name,
      description,
      paperIds,
    });

    if (!updated) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    res.json(updated);
  });

  app.delete('/api/collections/:id', (req: Request, res: Response): void => {
    const deleted = collectionStore.deleteCollection(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    res.status(204).send();
  });

  // Evidence Chunk Search Endpoint (Hybrid Retrieval Seam)
  app.post('/api/search', async (req: Request, res: Response): Promise<void> => {
    const { query, paperId, collectionId, limit } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'query is required and must be a non-empty string' });
      return;
    }

    const maxLimit = typeof limit === 'number' ? limit : 5;
    let results: EvidenceChunk[] = [];

    if (collectionId) {
      const collection = collectionStore.getCollection(collectionId);
      if (collection && collection.paperIds.length > 0) {
        results = await retrievalService.searchPartitioned(query, collection.paperIds, Math.max(1, Math.floor(maxLimit / collection.paperIds.length)));
      } else {
        results = [];
      }
    } else {
      results = await retrievalService.search(query, {
        paperId,
        limit: maxLimit,
      });
    }

    res.json({ results });
  });

  // Qdrant Cluster & Ingestion Statistics Endpoint
  app.get('/api/qdrant/stats', async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = await retrievalService.getStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch Qdrant stats' });
    }
  });

  // Observability & LangSmith Tracing Status Endpoint
  app.get('/api/observability/status', (_req: Request, res: Response): void => {
    res.json(getTracingStatus());
  });

  // Chat Streaming Endpoint with Grounded Synthesis & Attributions
  app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Partial<QueryRequest>;

    if (!body || typeof body.query !== 'string' || body.query.trim().length === 0) {
      res.status(400).json({ error: 'query is required and must be a non-empty string' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    await streamGroundedSynthesis(res, {
      query: body.query.trim(),
      paperId: body.paperId,
      collectionId: body.collectionId,
      history: body.history,
    });
  });

  return app;
}
