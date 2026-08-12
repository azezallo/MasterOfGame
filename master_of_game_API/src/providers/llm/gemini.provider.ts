import { ILLMProvider } from './llm_provider.interface';
import {
  LLMProviderId,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  ValidationResult,
  ProviderErrorEvent,
} from '../../types/ai.types';

export class GeminiProvider implements ILLMProvider {
  public readonly providerId: LLMProviderId = 'gemini';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  public async generate(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API Key is missing');
    }
    throw new Error('Gemini cloud provider integration is an architectural skeleton');
  }

  public async *stream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    if (!this.apiKey) {
      throw new Error('Gemini API Key is missing');
    }
    yield { delta: '', finishReason: 'stop' };
  }

  public async validateCredentials(customEndpoint?: string, apiKey?: string): Promise<ValidationResult> {
    const key = apiKey || this.apiKey;
    if (!key) {
      const errorEvent: ProviderErrorEvent = {
        code: 'GEMINI_INVALID_KEY',
        providerId: 'gemini',
        message: 'Невалідний API Key Google Gemini. Перевірте введений ключ у налаштуваннях ШІ.',
      };
      return {
        success: false,
        message: errorEvent.message,
        error: errorEvent,
      };
    }
    return {
      success: true,
      message: "З'єднання з Google Gemini готова до роботи",
      availableModels: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    };
  }
}
