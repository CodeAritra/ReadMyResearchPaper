import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTracingStatus,
  initializeTracing,
  withEvalProject,
  DEFAULT_PROJECT,
  EVAL_PROJECT,
} from './services/observability.js';

describe('Observability & LangSmith Tracing Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.LANGCHAIN_TRACING_V2;
    delete process.env.LANGCHAIN_API_KEY;
    delete process.env.LANGCHAIN_PROJECT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reports disabled when credentials are not configured', () => {
    const status = getTracingStatus();
    expect(status.enabled).toBe(false);
    expect(status.hasApiKey).toBe(false);
    expect(status.project).toBe(DEFAULT_PROJECT);
  });

  it('reports enabled when LANGCHAIN_TRACING_V2 is true and API key is provided', () => {
    process.env.LANGCHAIN_TRACING_V2 = 'true';
    process.env.LANGCHAIN_API_KEY = 'lsv2_test_key_123';
    process.env.LANGCHAIN_PROJECT = 'custom-research-project';

    const status = getTracingStatus();
    expect(status.enabled).toBe(true);
    expect(status.hasApiKey).toBe(true);
    expect(status.project).toBe('custom-research-project');
  });

  it('initializes default project name if none specified', () => {
    initializeTracing();
    expect(process.env.LANGCHAIN_PROJECT).toBe(DEFAULT_PROJECT);
  });

  it('isolates evaluation project during withEvalProject execution and restores original project', async () => {
    process.env.LANGCHAIN_PROJECT = DEFAULT_PROJECT;

    await withEvalProject(async () => {
      expect(process.env.LANGCHAIN_PROJECT).toBe(EVAL_PROJECT);
    });

    expect(process.env.LANGCHAIN_PROJECT).toBe(DEFAULT_PROJECT);
  });
});
