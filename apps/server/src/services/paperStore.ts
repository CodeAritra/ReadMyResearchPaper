import { Paper, Section } from '@research-qna/types';
import fs from 'fs';
import path from 'path';

export interface StoredPaper extends Paper {
  sections: Section[];
  rawMarkdown?: string;
  fileHash?: string;
}

class PaperStore {
  private papers = new Map<string, StoredPaper>();
  private manifestPath = path.resolve(process.cwd(), 'uploads/papers-manifest.json');

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.manifestPath)) {
        const raw = fs.readFileSync(this.manifestPath, 'utf8');
        const list: StoredPaper[] = JSON.parse(raw);
        for (const p of list) {
          this.papers.set(p.id, p);
        }
      }
    } catch (err) {
      console.warn('[PaperStore] Could not load manifest from disk:', err);
    }
  }

  private persistToDisk(): void {
    if (process.env.NODE_ENV === 'test') return;
    try {
      const dir = path.dirname(this.manifestPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.manifestPath, JSON.stringify(Array.from(this.papers.values()), null, 2), 'utf8');
    } catch (err) {
      console.warn('[PaperStore] Could not persist manifest to disk:', err);
    }
  }

  clear(): void {
    this.papers.clear();
  }

  savePaper(paper: StoredPaper): void {
    this.papers.set(paper.id, paper);
    this.persistToDisk();
  }

  getPaper(id: string): StoredPaper | undefined {
    return this.papers.get(id);
  }

  findByHash(hash: string): StoredPaper | undefined {
    if (!hash) return undefined;
    for (const paper of this.papers.values()) {
      if (paper.fileHash && paper.fileHash === hash) {
        return paper;
      }
    }
    return undefined;
  }

  findByTitle(title: string): StoredPaper | undefined {
    if (!title) return undefined;
    const clean = title.trim().toLowerCase();
    for (const paper of this.papers.values()) {
      if (paper.title && paper.title.trim().toLowerCase() === clean) {
        return paper;
      }
    }
    return undefined;
  }

  listPapers(): StoredPaper[] {
    return Array.from(this.papers.values());
  }
}

export const paperStore = new PaperStore();
