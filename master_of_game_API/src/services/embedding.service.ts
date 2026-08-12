export class EmbeddingService {
  private readonly dimensions: number = 384;

  /**
   * Generates a 384-dimensional Float32Array embedding for text input on CPU.
   * Uses a deterministic token hash projection algorithm to create dense vectors
   * preserving semantic similarity from word/character n-grams.
   */
  public generateEmbedding(text: string): Float32Array {
    const vector = new Float32Array(this.dimensions);
    const cleaned = text.toLowerCase().trim();
    if (!cleaned) return vector;

    const words = cleaned.split(/\s+/);
    const tokens: string[] = [...words];

    // Character n-grams (3-grams & 4-grams)
    for (const word of words) {
      if (word.length >= 3) {
        for (let i = 0; i <= word.length - 3; i++) {
          tokens.push(word.substring(i, i + 3));
        }
      }
      if (word.length >= 4) {
        for (let i = 0; i <= word.length - 4; i++) {
          tokens.push(word.substring(i, i + 4));
        }
      }
    }

    for (const token of tokens) {
      const hash1 = this.hashString(token, 0x811c9dc5);
      const hash2 = this.hashString(token, 0x27d4eb2f);

      const idx = Math.abs(hash1) % this.dimensions;
      const sign = (hash2 & 1) === 0 ? 1 : -1;

      vector[idx] += sign * 1.0;
    }

    // L2 Normalization
    let sumSq = 0;
    for (let i = 0; i < this.dimensions; i++) {
      sumSq += vector[i] * vector[i];
    }

    if (sumSq > 0) {
      const norm = Math.sqrt(sumSq);
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  private hashString(str: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h;
  }

  /**
   * Calculates cosine similarity between two 384-dimensional vectors.
   * Returns a float value between -1.0 and 1.0.
   */
  public cosineSimilarity(vecA: Float32Array | number[], vecB: Float32Array | number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i];
      const b = vecB[i];
      dot += a * b;
      normA += a * a;
      normB += b * b;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
