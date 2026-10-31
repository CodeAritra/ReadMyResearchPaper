import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('Document Ingestion API Seam', () => {
  it('should accept a PDF upload, process extraction asynchronously, and persist paper metadata and sections', async () => {
    const app = createApp();

    // Valid minimal PDF bytes for testing
    const samplePdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n168\n%%EOF'
    );

    const uploadResponse = await request(app)
      .post('/api/papers/upload')
      .attach('file', samplePdfBuffer, 'attention-paper.pdf')
      .expect(202);

    expect(uploadResponse.body).toHaveProperty('jobId');
    expect(uploadResponse.body).toHaveProperty('paperId');
    expect(uploadResponse.body.status).toBe('pending');

    const { jobId, paperId } = uploadResponse.body;

    // Check job status endpoint
    const statusResponse = await request(app)
      .get(`/api/jobs/${jobId}`)
      .expect(200);

    expect(statusResponse.body.jobId).toBe(jobId);
    expect(statusResponse.body.paperId).toBe(paperId);

    // Wait for the async worker to complete the job
    let attempts = 0;
    let completedJob = statusResponse.body;
    while (attempts < 20 && completedJob.status !== 'completed' && completedJob.status !== 'failed') {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const res = await request(app).get(`/api/jobs/${jobId}`);
      completedJob = res.body;
      attempts++;
    }

    expect(completedJob.status).toBe('completed');
    expect(completedJob.progress).toBe(100);

    // Verify paper metadata endpoint has sections and page count
    const paperResponse = await request(app)
      .get(`/api/papers/${paperId}`)
      .expect(200);

    expect(paperResponse.body.id).toBe(paperId);
    expect(paperResponse.body.title).toBeTruthy();
    expect(paperResponse.body.pageCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(paperResponse.body.sections)).toBe(true);
    expect(paperResponse.body.sections.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect duplicate uploads of the same PDF file and reuse existing paper without re-indexing', async () => {
    const app = createApp();

    const samplePdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n168\n%%EOF'
    );

    // Initial upload
    const firstUpload = await request(app)
      .post('/api/papers/upload')
      .attach('file', samplePdfBuffer, 'paper-dedup.pdf');

    const firstPaperId = firstUpload.body.paperId;

    // Second upload of the EXACT same bytes
    const duplicateUpload = await request(app)
      .post('/api/papers/upload')
      .attach('file', samplePdfBuffer, 'paper-dedup-duplicate.pdf')
      .expect(200);

    expect(duplicateUpload.body.duplicate).toBe(true);
    expect(duplicateUpload.body.paperId).toBe(firstPaperId);
    expect(duplicateUpload.body.status).toBe('completed');
  });

  it('should return 400 Bad Request when no file is uploaded', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/papers/upload')
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('PDF file is required');
  });

  it('should return 404 for non-existent jobId', async () => {
    const app = createApp();

    await request(app)
      .get('/api/jobs/non-existent-job-id')
      .expect(404);
  });
});
