import express, { Request, Response } from 'express';
import cors from 'cors';
import { QueryRequest } from '@research-qna/types';

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'research-qna-server' });
  });

  app.post('/api/chat', (req: Request, res: Response): void => {
    const body = req.body as Partial<QueryRequest>;

    if (!body || typeof body.query !== 'string' || body.query.trim().length === 0) {
      res.status(400).json({ error: 'query is required and must be a non-empty string' });
      return;
    }

    // Set Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Stream tracer tokens
    const sampleTokens = [
      'Analyzing ',
      'research ',
      'paper... ',
      'Retrieval-augmented ',
      'generation ',
      'initialized.'
    ];

    sampleTokens.forEach((token) => {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
  });

  return app;
}
