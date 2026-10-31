import { Collection } from '@research-qna/types';
import crypto from 'crypto';

class CollectionStore {
  private collections = new Map<string, Collection>();

  createCollection(params: {
    name: string;
    description?: string;
    paperIds?: string[];
  }): Collection {
    const now = new Date().toISOString();
    const collection: Collection = {
      id: `col-${crypto.randomUUID()}`,
      name: params.name.trim(),
      description: params.description?.trim(),
      paperIds: params.paperIds ? [...params.paperIds] : [],
      createdAt: now,
      updatedAt: now,
    };
    this.collections.set(collection.id, collection);
    return collection;
  }

  getCollection(id: string): Collection | undefined {
    return this.collections.get(id);
  }

  listCollections(): Collection[] {
    return Array.from(this.collections.values());
  }

  updateCollection(
    id: string,
    updates: {
      name?: string;
      description?: string;
      paperIds?: string[];
    }
  ): Collection | undefined {
    const existing = this.collections.get(id);
    if (!existing) return undefined;

    const updated: Collection = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      paperIds: updates.paperIds !== undefined ? [...updates.paperIds] : existing.paperIds,
      updatedAt: new Date().toISOString(),
    };

    this.collections.set(id, updated);
    return updated;
  }

  deleteCollection(id: string): boolean {
    return this.collections.delete(id);
  }

  clear(): void {
    this.collections.clear();
  }
}

export const collectionStore = new CollectionStore();
