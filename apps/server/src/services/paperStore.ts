import { Paper, Section } from '@research-qna/types';

export interface StoredPaper extends Paper {
  sections: Section[];
  rawMarkdown?: string;
  fileHash?: string;
}

class PaperStore {
  private papers = new Map<string, StoredPaper>();

  savePaper(paper: StoredPaper): void {
    this.papers.set(paper.id, paper);
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
