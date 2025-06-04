// Utility functions for working with embeddings

export function parseEmbedding(text: string): number[] {
  try {
    // Remove whitespace and parse as JSON array
    const cleaned = text.trim();
    const parsed = JSON.parse(cleaned);
    
    if (!Array.isArray(parsed)) {
      throw new Error('Embedding must be an array');
    }
    
    if (parsed.some(val => typeof val !== 'number' || !isFinite(val))) {
      throw new Error('Embedding must contain only finite numbers');
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format. Please paste a valid JSON array.');
    }
    throw error;
  }
}

export function validateEmbedding(embedding: number[]): { valid: boolean; message?: string } {
  if (!Array.isArray(embedding)) {
    return { valid: false, message: 'Embedding must be an array' };
  }
  
  if (embedding.length === 0) {
    return { valid: false, message: 'Embedding cannot be empty' };
  }
  
  if (embedding.some(val => typeof val !== 'number' || !isFinite(val))) {
    return { valid: false, message: 'Embedding must contain only finite numbers' };
  }
  
  return { valid: true };
}

export function formatEmbedding(embedding: number[], maxDisplay: number = 5): string {
  if (embedding.length <= maxDisplay) {
    return `[${embedding.map(n => n.toFixed(4)).join(', ')}]`;
  }
  
  const displayed = embedding.slice(0, maxDisplay).map(n => n.toFixed(4));
  return `[${displayed.join(', ')}, ...]`;
}

export function calculateCosineDistance(vectorA: number[], vectorB: number[]): number {
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

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error('Cannot calculate distance for zero vectors');
  }

  const cosineSimilarity = dotProduct / (magnitudeA * magnitudeB);
  return 1 - cosineSimilarity; // Convert similarity to distance
}
