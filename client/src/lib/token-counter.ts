// Simplified token counting utility
// In a production app, you'd want to use a proper tokenizer library
export function countTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Rough estimation: ~4 characters per token for English text
  // This matches OpenAI's rough estimation guidelines
  return Math.ceil(text.length / 4);
}

export function validateTokenLimit(text: string, limit: number): { valid: boolean; count: number } {
  const count = countTokens(text);
  return {
    valid: count <= limit,
    count,
  };
}

export function validateChunks(chunks: string[], chunkLimit: number, tokenLimit: number): {
  valid: boolean;
  chunkCount: number;
  invalidChunks: Array<{ index: number; tokenCount: number; text: string }>;
} {
  if (chunks.length > chunkLimit) {
    return {
      valid: false,
      chunkCount: chunks.length,
      invalidChunks: [],
    };
  }

  const invalidChunks = chunks
    .map((chunk, index) => {
      const tokenCount = countTokens(chunk);
      return {
        index,
        tokenCount,
        text: chunk.substring(0, 50) + (chunk.length > 50 ? "..." : ""),
        valid: tokenCount <= tokenLimit,
      };
    })
    .filter(chunk => !chunk.valid);

  return {
    valid: invalidChunks.length === 0,
    chunkCount: chunks.length,
    invalidChunks,
  };
}
