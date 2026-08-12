import { ILLMProvider } from './llm_provider.interface';
import {
  LLMProviderId,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  ValidationResult,
  ProviderErrorEvent,
} from '../../types/ai.types';

export class OpenAIProvider implements ILLMProvider {
  public readonly providerId: LLMProviderId = 'openai';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  public async generate(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API Key is missing');
    }
    throw new Error('OpenAI cloud provider integration is an architectural skeleton');
  }

  public async *stream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    if (!this.apiKey) {
      throw new Error('OpenAI API Key is missing');
    }
    yield { delta: '', finishReason: 'stop' };
  }

  public async validateCredentials(customEndpoint?: string, apiKey?: string): Promise<ValidationResult> {
    const key = apiKey || this.apiKey;
    if (!key) {
      const errorEvent: ProviderErrorEvent = {
        code: 'OPENAI_KEY_MISSING',
        providerId: 'openai',
        message: 'API Key OpenAI не вказано. Перевірте введений ключ у налаштуваннях ШІ.',
      };
      return {
        success: false,
        message: errorEvent.message,
        error: errorEvent,
      };
    }
    return {
      success: true,
      message: "З'єднання з OpenAI готова до роботи",
      availableModels: ['gpt-4o', 'gpt-4o-mini'],
    };
  }
}
