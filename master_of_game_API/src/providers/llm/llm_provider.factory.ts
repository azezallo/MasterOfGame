import { ILLMProvider } from './llm_provider.interface';
import { OpenAICompatibleProvider } from './openai_compatible.provider';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { LLMProviderId, UserAISettings } from '../../types/ai.types';

export class LLMProviderFactory {
  public static getProvider(
    providerId: LLMProviderId,
    options?: { customEndpoint?: string; apiKey?: string }
  ): ILLMProvider {
    switch (providerId) {
      case 'openai_compatible':
        return new OpenAICompatibleProvider(options?.customEndpoint, options?.apiKey);
      case 'openai':
        return new OpenAIProvider(options?.apiKey);
      case 'anthropic':
        return new AnthropicProvider(options?.apiKey);
      case 'gemini':
        return new GeminiProvider(options?.apiKey);
      default:
        throw new Error(`Unsupported LLM provider ID: ${providerId}`);
    }
  }

  public static createFromSettings(settings: UserAISettings, decryptedApiKey?: string): ILLMProvider {
    return LLMProviderFactory.getProvider(settings.providerId, {
      customEndpoint: settings.customEndpoint,
      apiKey: decryptedApiKey,
    });
  }
}
