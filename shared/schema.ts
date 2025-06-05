import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  model: text("model").notNull(),
  embedding: jsonb("embedding").notNull(), // Store as JSON array
  tokenCount: integer("token_count").notNull(),
});

export const insertEmbeddingSchema = createInsertSchema(embeddings).omit({
  id: true,
});

export type InsertEmbedding = z.infer<typeof insertEmbeddingSchema>;
export type Embedding = typeof embeddings.$inferSelect;

// Request/Response schemas
export const generateEmbeddingSchema = z.object({
  text: z.string().min(1).max(10000),
  model: z.enum(["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002", "BAAI/bge-small-en-v1.5"]),
});

export const calculateDistanceSchema = z.object({
  embeddingA: z.array(z.number()),
  embeddingB: z.array(z.number()),
  metric: z.enum(["cosine"]).default("cosine"),
});

export type GenerateEmbeddingRequest = z.infer<typeof generateEmbeddingSchema>;
export type CalculateDistanceRequest = z.infer<typeof calculateDistanceSchema>;

export interface GenerateEmbeddingResponse {
  embedding: number[];
  tokenCount: number;
  dimensions: number;
  processingTime: number;
}

export interface CalculateDistanceResponse {
  distance: number;
  similarity: number;
  metric: string;
  processingTime: number;
  vectorDimensions: string;
}
