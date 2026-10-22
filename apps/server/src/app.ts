import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { QueryRequest } from '@research-qna/types';
import { jobManager } from './services/jobManager.js';
import { paperStore } from './services/paperStore.js';
import { extractDocumentStructure } from './services/extraction.js';
import { chunkPaperBySections, retrievalService } from './services/retrieval.js';
import { streamGroundedSynthesis } from './services/synthesis.js';

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
  const app = express();

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

      const paperId = `paper-${crypto.randomUUID()}`;
      const job = jobManager.createJob(paperId);

      res.status(202).json({
        jobId: job.jobId,
        paperId,
        status: job.status,
        message: 'PDF upload accepted for asynchronous extraction',
      });

      // Dispatch background async extraction worker
      const filePath = req.file.path;
      const originalFilename = req.file.originalname;

      (async () => {
        try {
          jobManager.updateJob(job.jobId, { status: 'parsing', progress: 20 });
          const extracted = await extractDocumentStructure(filePath, originalFilename);

          jobManager.updateJob(job.jobId, { status: 'extracting', progress: 50 });

          const paper = {
            id: paperId,
            title: extracted.title,
            authors: extracted.authors,
            pageCount: extracted.pageCount,
            filePath,
            sections: extracted.sections,
            rawMarkdown: extracted.rawMarkdown,
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

  // List all indexed papers
  app.get('/api/papers', (_req: Request, res: Response): void => {
    res.json(paperStore.listPapers());
  });

  // Evidence Chunk Search Endpoint (Hybrid Retrieval Seam)
  app.post('/api/search', async (req: Request, res: Response): Promise<void> => {
    const { query, paperId, limit } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'query is required and must be a non-empty string' });
      return;
    }

    const results = await retrievalService.search(query, {
      paperId,
      limit: typeof limit === 'number' ? limit : 5,
    });

    res.json({ results });
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
      history: body.history,
    });
  });

  return app;
}
