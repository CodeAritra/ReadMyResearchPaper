import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { collectionStore } from './services/collectionStore.js';

describe('Collection Management API Boundary (/api/collections)', () => {
  const app = createApp();

  beforeEach(() => {
    collectionStore.clear();
  });

  it('creates and retrieves a new Collection with Papers', async () => {
    // 1. Create collection
    const createRes = await request(app)
      .post('/api/collections')
      .send({
        name: 'Attention Mechanisms Review',
        description: 'Comparative literature review on transformer attention variants',
        paperIds: ['paper-transformer-01', 'paper-transformer-02'],
      })
      .expect(201);

    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.name).toBe('Attention Mechanisms Review');
    expect(createRes.body.paperIds).toEqual(['paper-transformer-01', 'paper-transformer-02']);
    expect(createRes.body.createdAt).toBeDefined();

    const collectionId = createRes.body.id;

    // 2. Fetch the created collection by ID
    const getRes = await request(app)
      .get(`/api/collections/${collectionId}`)
      .expect(200);

    expect(getRes.body.id).toBe(collectionId);
    expect(getRes.body.name).toBe('Attention Mechanisms Review');
    expect(getRes.body.paperIds).toHaveLength(2);

    // 3. List all collections
    const listRes = await request(app)
      .get('/api/collections')
      .expect(200);

    expect(listRes.body).toBeInstanceOf(Array);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(collectionId);
  });

  it('rejects creation if name is missing or empty', async () => {
    const res = await request(app)
      .post('/api/collections')
      .send({
        description: 'Missing name',
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('name is required');
  });

  it('updates an existing collection name and paperIds', async () => {
    const createRes = await request(app)
      .post('/api/collections')
      .send({
        name: 'Initial Name',
        paperIds: ['paper-01'],
      })
      .expect(201);

    const collectionId = createRes.body.id;

    const patchRes = await request(app)
      .patch(`/api/collections/${collectionId}`)
      .send({
        name: 'Updated Name',
        paperIds: ['paper-01', 'paper-02'],
      })
      .expect(200);

    expect(patchRes.body.name).toBe('Updated Name');
    expect(patchRes.body.paperIds).toEqual(['paper-01', 'paper-02']);
  });

  it('deletes an existing collection', async () => {
    const createRes = await request(app)
      .post('/api/collections')
      .send({
        name: 'To Delete',
      })
      .expect(201);

    const collectionId = createRes.body.id;

    await request(app)
      .delete(`/api/collections/${collectionId}`)
      .expect(204);

    await request(app)
      .get(`/api/collections/${collectionId}`)
      .expect(404);
  });
});
