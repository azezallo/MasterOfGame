import { ILLMProvider } from './llm_provider.interface';
import {
  LLMProviderId,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  ValidationResult,
  ProviderErrorEvent,
} from '../../types/ai.types';

export class AnthropicProvider implements ILLMProvider {
  public readonly providerId: LLMProviderId = 'anthropic';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  public async generate(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API Key is missing');
    }
    throw new Error('Anthropic cloud provider integration is an architectural skeleton');
  }

  public async *stream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    if (!this.apiKey) {
      throw new Error('Anthropic API Key is missing');
    }
    yield { delta: '', finishReason: 'stop' };
  }

  public async validateCredentials(customEndpoint?: string, apiKey?: string): Promise<ValidationResult> {
    const key = apiKey || this.apiKey;
    if (!key) {
      const errorEvent: ProviderErrorEvent = {
        code: 'ANTHROPIC_INVALID_KEY',
        providerId: 'anthropic',
        message: 'Невалідний API Key Anthropic (Error 401). Перевірте введений ключ у налаштуваннях ШІ.',
      };
      return {
        success: false,
        message: errorEvent.message,
        error: errorEvent,
      };
    }
    return {
      success: true,
      message: "З'єднання з Anthropic готова до роботи",
      availableModels: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    };
  }
}
