import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('POST /api/chat (SSE Streaming Chat Seam)', () => {
  it('should stream response tokens over Server-Sent Events', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/chat')
      .send({
        query: 'What is the core methodology of this paper?'
      })
      .expect(200);

    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.headers['cache-control']).toContain('no-cache');

    // Verify SSE payload contains streaming data and terminates with [DONE]
    const text = response.text;
    expect(text).toContain('data:');
    expect(text).toContain('[DONE]');
  });

  it('should return 400 Bad Request if query is missing', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/chat')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('query is required');
  });
});
