import { AISettingsRepository } from '../repositories/ai_settings.repository';
import { EncryptionService } from './encryption.service';
import { LLMProviderFactory } from '../providers/llm/llm_provider.factory';
import { UpdateAISettingsSchema, TestConnectionSchema } from '../schemas/ai_settings.schema';
import {
  UserAISettings,
  UserAISettingsDTO,
  UpdateAISettingsPayload,
  TestConnectionPayload,
  ValidationResult,
} from '../types/ai.types';
import { ValidationError } from '../errors/app.errors';

export class AISettingsService {
  private repository: AISettingsRepository;
  private encryptionService: EncryptionService;

  constructor(repository?: AISettingsRepository, encryptionService?: EncryptionService) {
    this.repository = repository || new AISettingsRepository();
    this.encryptionService = encryptionService || new EncryptionService();
  }

  public async getSettings(userId: string | number): Promise<UserAISettingsDTO> {
    const stringUserId = String(userId);
    const settings = this.repository.findByUserId(stringUserId);

    if (!settings) {
      return {
        isConfigured: false,
        providerId: 'openai_compatible',
        customEndpoint: 'http://localhost:1234/v1',
        modelName: 'Qwen2.5-7B-Instruct',
        temperature: 0.7,
        timeoutMs: 0,
        embeddingProvider: 'fastembed',
        hasApiKey: false,
      };
    }

    return {
      isConfigured: settings.isConfigured,
      providerId: settings.providerId,
      customEndpoint: settings.customEndpoint,
      modelName: settings.modelName,
      temperature: settings.temperature,
      timeoutMs: settings.timeoutMs,
      embeddingProvider: settings.embeddingProvider,
      hasApiKey: Boolean(settings.encryptedApiKey),
    };
  }

  public async saveSettings(
    userId: string | number,
    payload: UpdateAISettingsPayload
  ): Promise<UserAISettingsDTO> {
    const parseResult = UpdateAISettingsSchema.safeParse(payload);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw new ValidationError(`Validation error: ${issue?.message || 'Invalid input'}`);
    }
    const validated = parseResult.data;

    const stringUserId = String(userId);
    const existing = this.repository.findByUserId(stringUserId);

    let encryptedApiKey: string | null = existing?.encryptedApiKey || null;

    if (validated.apiKey !== undefined) {
      if (validated.apiKey && validated.apiKey.trim().length > 0) {
        encryptedApiKey = this.encryptionService.encrypt(validated.apiKey.trim());
      } else if (validated.apiKey === null) {
        encryptedApiKey = null;
      }
    }

    const settingsToSave: UserAISettings = {
      userId: stringUserId,
      providerId: validated.providerId,
      customEndpoint: validated.customEndpoint || undefined,
      encryptedApiKey,
      modelName: validated.modelName,
      temperature: validated.temperature,
      timeoutMs: validated.timeoutMs,
      embeddingProvider: validated.embeddingProvider,
      isConfigured: true,
    };

    const saved = this.repository.upsertSettings(settingsToSave);

    return {
      isConfigured: saved.isConfigured,
      providerId: saved.providerId,
      customEndpoint: saved.customEndpoint,
      modelName: saved.modelName,
      temperature: saved.temperature,
      timeoutMs: saved.timeoutMs,
      embeddingProvider: saved.embeddingProvider,
      hasApiKey: Boolean(saved.encryptedApiKey),
    };
  }

  public async testConnection(payload: TestConnectionPayload): Promise<ValidationResult> {
    const parseResult = TestConnectionSchema.safeParse(payload);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw new ValidationError(`Validation error: ${issue?.message || 'Invalid input'}`);
    }
    const validated = parseResult.data;

    const provider = LLMProviderFactory.getProvider(validated.providerId, {
      customEndpoint: validated.customEndpoint || undefined,
      apiKey: validated.apiKey || undefined,
    });

    return provider.validateCredentials(validated.customEndpoint || undefined, validated.apiKey || undefined);
  }

  public async getDecryptedSettings(userId: string | number): Promise<{ settings: UserAISettings; apiKey?: string }> {
    const stringUserId = String(userId);
    const settings = this.repository.findByUserId(stringUserId);
    if (!settings) {
      throw new ValidationError('AI settings are not configured for this user');
    }

    let apiKey: string | undefined;
    if (settings.encryptedApiKey) {
      apiKey = this.encryptionService.decrypt(settings.encryptedApiKey);
    }

    return { settings, apiKey };
  }
}
