import { describe, it, expect } from 'vitest';
import { EmbeddingService } from '../services/embedding.service';

describe('EmbeddingService', () => {
  const service = new EmbeddingService();

  it('should generate a 384-dimensional Float32Array embedding', () => {
    const embedding = service.generateEmbedding('Hello world, test phrase');
    expect(embedding).toBeInstanceOf(Float32Array);
    expect(embedding.length).toBe(384);
  });

  it('should produce deterministic embeddings for identical inputs', () => {
    const text = 'The magical sword is hidden in the dark cavern.';
    const vec1 = service.generateEmbedding(text);
    const vec2 = service.generateEmbedding(text);

    expect(vec1).toEqual(vec2);
  });

  it('should calculate cosine similarity correctly', () => {
    const textA = 'Where is the dragon hidden?';
    const textB = 'Where is the dragon hidden?';
    const textC = 'Quantum electrodynamics in semiconductor devices.';

    const vecA = service.generateEmbedding(textA);
    const vecB = service.generateEmbedding(textB);
    const vecC = service.generateEmbedding(textC);

    const simSelf = service.cosineSimilarity(vecA, vecB);
    const simDiff = service.cosineSimilarity(vecA, vecC);

    expect(simSelf).toBeCloseTo(1.0, 4);
    expect(simDiff).toBeLessThan(simSelf);
  });

  it('should handle empty or whitespace inputs gracefully', () => {
    const vecEmpty = service.generateEmbedding('');
    expect(vecEmpty.length).toBe(384);
    expect(vecEmpty.every(v => v === 0)).toBe(true);
  });
});
