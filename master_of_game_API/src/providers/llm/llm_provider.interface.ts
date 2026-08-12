import {
  LLMProviderId,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  ValidationResult,
} from '../../types/ai.types';

export interface ILLMProvider {
  readonly providerId: LLMProviderId;
  generate(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
  stream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk>;
  validateCredentials(customEndpoint?: string, apiKey?: string): Promise<ValidationResult>;
}
