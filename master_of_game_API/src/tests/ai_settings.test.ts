import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AISettingsRepository } from '../repositories/ai_settings.repository';
import { AISettingsService } from '../services/ai_settings.service';

const TEST_DB_PATH = path.resolve(__dirname, 'test_ai_settings.db');

describe('AISettings Integration', () => {
  let repository: AISettingsRepository;
  let service: AISettingsService;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    repository = new AISettingsRepository(TEST_DB_PATH);
    service = new AISettingsService(repository);
  });

  afterEach(() => {
    repository.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should return unconfigured defaults for new user', async () => {
    const settings = await service.getSettings('user_1');
    expect(settings.isConfigured).toBe(false);
    expect(settings.providerId).toBe('openai_compatible');
    expect(settings.customEndpoint).toBe('http://localhost:1234/v1');
    expect(settings.modelName).toBe('Qwen2.5-7B-Instruct');
    expect(settings.timeoutMs).toBe(0);
    expect(settings.hasApiKey).toBe(false);
  });

  it('should save and retrieve user settings with encrypted API key', async () => {
    const saved = await service.saveSettings('user_1', {
      providerId: 'openai_compatible',
      customEndpoint: 'http://localhost:1234/v1',
      modelName: 'Llama-3.1-8B-Instruct',
      temperature: 0.8,
      timeoutMs: 0,
      embeddingProvider: 'fastembed',
      apiKey: 'secret_local_key',
    });

    expect(saved.isConfigured).toBe(true);
    expect(saved.modelName).toBe('Llama-3.1-8B-Instruct');
    expect(saved.hasApiKey).toBe(true);

    const fetched = await service.getSettings('user_1');
    expect(fetched.isConfigured).toBe(true);
    expect(fetched.hasApiKey).toBe(true);

    const decrypted = await service.getDecryptedSettings('user_1');
    expect(decrypted.apiKey).toBe('secret_local_key');
  });

  it('should throw validation error for invalid URL', async () => {
    await expect(
      service.saveSettings('user_1', {
        providerId: 'openai_compatible',
        customEndpoint: 'ftp://invalid-url',
        modelName: 'TestModel',
        temperature: 0.7,
        timeoutMs: 0,
        embeddingProvider: 'fastembed',
      })
    ).rejects.toThrow('Validation error');
  });
});
