export type LLMProviderId = 'openai_compatible' | 'openai' | 'anthropic' | 'gemini';
export type EmbeddingProviderId = 'fastembed' | 'openai';

export interface LLMToolFunction {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface LLMToolDefinition {
  type: 'function';
  function: LLMToolFunction;
}

export interface LLMToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
}

export interface LLMCompletionRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: LLMToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required' | Record<string, any>;
  timeoutMs?: number;
}

export interface LLMCompletionResponse {
  id?: string;
  content: string | null;
  toolCalls?: LLMToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface LLMStreamChunk {
  delta: string;
  finishReason?: string | null;
  toolCalls?: Array<{
    index?: number;
    id?: string;
    type?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

export interface ProviderErrorEvent {
  code: string;
  providerId: LLMProviderId;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  availableModels?: string[];
  error?: ProviderErrorEvent;
}

export interface UserAISettings {
  userId: string;
  providerId: LLMProviderId;
  customEndpoint?: string;
  encryptedApiKey?: string | null;
  modelName: string;
  temperature: number;
  timeoutMs: number;
  maxContextTokens: number;
  embeddingProvider: EmbeddingProviderId;
  isConfigured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAISettingsDTO {
  isConfigured: boolean;
  providerId: LLMProviderId;
  customEndpoint?: string;
  modelName: string;
  temperature: number;
  timeoutMs: number;
  maxContextTokens: number;
  embeddingProvider: EmbeddingProviderId;
  hasApiKey: boolean;
}

export interface UpdateAISettingsPayload {
  providerId: LLMProviderId;
  customEndpoint?: string;
  modelName: string;
  temperature: number;
  timeoutMs: number;
  maxContextTokens: number;
  embeddingProvider: EmbeddingProviderId;
  apiKey?: string | null;
}

export interface TestConnectionPayload {
  providerId: LLMProviderId;
  customEndpoint?: string;
  apiKey?: string | null;
}
