import { describe, it, expect } from 'vitest';
import { aiSettingsSchema, PRESET_MODELS, DEFAULT_ENDPOINTS } from '../types';

describe('AI Settings Data Contracts & Helpers', () => {
  it('should validate valid AI settings payload', () => {
    const validData = {
      providerId: 'openai_compatible',
      customEndpoint: 'http://localhost:1234/v1',
      modelName: 'Qwen2.5-7B-Instruct',
      temperature: 0.7,
      timeoutMs: 0,
      maxContextTokens: 32000,
      embeddingProvider: 'fastembed',
      apiKey: null,
    };

    const result = aiSettingsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid modelName', () => {
    const invalidData = {
      providerId: 'openai_compatible',
      customEndpoint: 'http://localhost:1234/v1',
      modelName: '',
      temperature: 0.7,
      timeoutMs: 0,
      maxContextTokens: 32000,
      embeddingProvider: 'fastembed',
    };

    const result = aiSettingsSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should provide default endpoints and model presets', () => {
    expect(DEFAULT_ENDPOINTS.openai_compatible).toBe('http://localhost:1234/v1');
    expect(PRESET_MODELS.openai_compatible).toContain('Qwen2.5-7B-Instruct');
    expect(PRESET_MODELS.openai).toContain('gpt-4o');
  });
});
