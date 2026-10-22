import { Paper, Section } from '@research-qna/types';

export interface StoredPaper extends Paper {
  sections: Section[];
  rawMarkdown?: string;
}

class PaperStore {
  private papers = new Map<string, StoredPaper>();

  savePaper(paper: StoredPaper): void {
    this.papers.set(paper.id, paper);
  }

  getPaper(id: string): StoredPaper | undefined {
    return this.papers.get(id);
  }

  listPapers(): StoredPaper[] {
    return Array.from(this.papers.values());
  }
}

export const paperStore = new PaperStore();
