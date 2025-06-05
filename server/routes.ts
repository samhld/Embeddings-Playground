import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  generateEmbeddingSchema, 
  calculateDistanceSchema,
  type GenerateEmbeddingResponse,
  type CalculateDistanceResponse 
} from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

// Token counting utility (simplified)
function countTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

// Cosine distance calculation
function calculateCosineDistance(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  const cosineSimilarity = dotProduct / (magnitudeA * magnitudeB);
  return 1 - cosineSimilarity; // Convert similarity to distance
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Generate embedding endpoint
  app.post("/api/embeddings/generate", async (req, res) => {
    try {
      const startTime = Date.now();
      const { text, model } = generateEmbeddingSchema.parse(req.body);
      
      // Count tokens and validate
      const tokenCount = countTokens(text);
      if (tokenCount > 500) {
        return res.status(400).json({ 
          message: `Text exceeds token limit. Found ${tokenCount} tokens, maximum 500 allowed.` 
        });
      }

      // Generate embedding using OpenAI
      const embeddingParams: any = {
        model,
        input: text,
      };
      
      // Configure dimensions for text-embedding-3-large to use half (1536 instead of 3072)
      if (model === "text-embedding-3-large") {
        embeddingParams.dimensions = 1536;
        console.log(`Setting dimensions to 1536 for text-embedding-3-large`);
      }
      
      console.log(`Embedding params:`, embeddingParams);
      const response = await openai.embeddings.create(embeddingParams);
      console.log(`Response embedding length:`, response.data[0].embedding.length);

      const embedding = response.data[0].embedding;
      const processingTime = Date.now() - startTime;

      // Save to storage
      await storage.saveEmbedding({
        text,
        model,
        embedding,
        tokenCount,
      });

      const result: GenerateEmbeddingResponse = {
        embedding,
        tokenCount,
        dimensions: embedding.length,
        processingTime,
      };

      res.json(result);
    } catch (error: any) {
      console.error("Error generating embedding:", error);
      res.status(500).json({ 
        message: error.message || "Failed to generate embedding" 
      });
    }
  });

  // Calculate distance endpoint
  app.post("/api/embeddings/distance", async (req, res) => {
    try {
      const startTime = Date.now();
      const { embeddingA, embeddingB, metric } = calculateDistanceSchema.parse(req.body);

      if (embeddingA.length !== embeddingB.length) {
        return res.status(400).json({
          message: `Embedding dimensions must match. A: ${embeddingA.length}, B: ${embeddingB.length}`
        });
      }

      let distance: number;
      
      switch (metric) {
        case "cosine":
          distance = calculateCosineDistance(embeddingA, embeddingB);
          break;
        default:
          return res.status(400).json({ message: "Unsupported distance metric" });
      }

      const similarity = (1 - distance) * 100; // Convert to percentage
      const processingTime = Date.now() - startTime;

      const result: CalculateDistanceResponse = {
        distance,
        similarity,
        metric,
        processingTime,
        vectorDimensions: `${embeddingA.length} × ${embeddingB.length}`,
      };

      res.json(result);
    } catch (error: any) {
      console.error("Error calculating distance:", error);
      res.status(500).json({ 
        message: error.message || "Failed to calculate distance" 
      });
    }
  });

  // Validate text chunks endpoint
  app.post("/api/embeddings/validate-chunks", async (req, res) => {
    try {
      const { chunks } = req.body;
      
      if (!Array.isArray(chunks)) {
        return res.status(400).json({ message: "Chunks must be an array" });
      }

      if (chunks.length > 100) {
        return res.status(400).json({ 
          message: `Too many chunks. Found ${chunks.length}, maximum 100 allowed.` 
        });
      }

      const validation = chunks.map((chunk: string, index: number) => {
        const tokenCount = countTokens(chunk);
        return {
          index,
          tokenCount,
          valid: tokenCount <= 500,
          text: chunk.substring(0, 50) + (chunk.length > 50 ? "..." : ""),
        };
      });

      const invalidChunks = validation.filter(v => !v.valid);
      
      res.json({
        valid: invalidChunks.length === 0,
        totalChunks: chunks.length,
        invalidChunks,
        validation,
      });
    } catch (error: any) {
      console.error("Error validating chunks:", error);
      res.status(500).json({ 
        message: error.message || "Failed to validate chunks" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
