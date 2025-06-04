import { embeddings, type Embedding, type InsertEmbedding } from "@shared/schema";

// Storage interface for embeddings
export interface IStorage {
  // Embeddings methods
  saveEmbedding(embedding: InsertEmbedding): Promise<Embedding>;
  getEmbedding(id: number): Promise<Embedding | undefined>;
  getEmbeddingsByModel(model: string): Promise<Embedding[]>;
}

export class MemStorage implements IStorage {
  private embeddings: Map<number, Embedding>;
  private currentId: number;

  constructor() {
    this.embeddings = new Map();
    this.currentId = 1;
  }

  async saveEmbedding(insertEmbedding: InsertEmbedding): Promise<Embedding> {
    const id = this.currentId++;
    const embedding: Embedding = { ...insertEmbedding, id };
    this.embeddings.set(id, embedding);
    return embedding;
  }

  async getEmbedding(id: number): Promise<Embedding | undefined> {
    return this.embeddings.get(id);
  }

  async getEmbeddingsByModel(model: string): Promise<Embedding[]> {
    return Array.from(this.embeddings.values()).filter(
      (embedding) => embedding.model === model
    );
  }
}

export const storage = new MemStorage();
