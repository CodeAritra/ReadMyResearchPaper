import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Docker Containerization & Compose Specification Seam (Ticket 07)', () => {
  const repoRoot = path.resolve(__dirname, '../../..');

  it('validates apps/server/Dockerfile multi-stage production definition', () => {
    const serverDockerfilePath = path.join(repoRoot, 'apps/server/Dockerfile');
    expect(fs.existsSync(serverDockerfilePath)).toBe(true);

    const content = fs.readFileSync(serverDockerfilePath, 'utf-8');
    expect(content).toContain('AS builder');
    expect(content).toContain('AS runner');
    expect(content).toContain('EXPOSE 3001');
    expect(content).toContain('HEALTHCHECK');
    expect(content).toContain('node');
  });

  it('validates apps/web/Dockerfile multi-stage production definition', () => {
    const webDockerfilePath = path.join(repoRoot, 'apps/web/Dockerfile');
    expect(fs.existsSync(webDockerfilePath)).toBe(true);

    const content = fs.readFileSync(webDockerfilePath, 'utf-8');
    expect(content).toContain('AS builder');
    expect(content).toContain('AS runner');
    expect(content).toContain('EXPOSE 3000');
    expect(content).toContain('standalone');
  });

  it('validates next.config.mjs standalone output configuration', () => {
    const nextConfigPath = path.join(repoRoot, 'apps/web/next.config.mjs');
    expect(fs.existsSync(nextConfigPath)).toBe(true);

    const content = fs.readFileSync(nextConfigPath, 'utf-8');
    expect(content).toContain('standalone');
  });

  it('validates root docker-compose.yml service orchestration', () => {
    const composePath = path.join(repoRoot, 'docker-compose.yml');
    expect(fs.existsSync(composePath)).toBe(true);

    const content = fs.readFileSync(composePath, 'utf-8');
    expect(content).toContain('services:');
    expect(content).toContain('server:');
    expect(content).toContain('web:');
    expect(content).toContain('3001:3001');
    expect(content).toContain('3000:3000');
    expect(content).toContain('depends_on:');
  });

  it('validates root .dockerignore build context exclusions', () => {
    const dockerignorePath = path.join(repoRoot, '.dockerignore');
    expect(fs.existsSync(dockerignorePath)).toBe(true);

    const content = fs.readFileSync(dockerignorePath, 'utf-8');
    expect(content).toContain('node_modules');
    expect(content).toContain('.git');
    expect(content).toContain('.next');
  });
});
