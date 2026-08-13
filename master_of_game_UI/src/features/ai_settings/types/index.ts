import { z } from 'zod';

export type LLMProviderId = 'openai_compatible' | 'openai' | 'anthropic' | 'gemini';
export type EmbeddingProviderId = 'fastembed' | 'openai';

export interface AISettingsResponse {
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

export interface SaveAISettingsRequest {
  providerId: LLMProviderId;
  customEndpoint?: string;
  modelName: string;
  temperature: number;
  timeoutMs: number;
  maxContextTokens: number;
  embeddingProvider: EmbeddingProviderId;
  apiKey?: string | null;
}

export interface TestConnectionRequest {
  providerId: LLMProviderId;
  customEndpoint?: string;
  apiKey?: string | null;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  latencyMs?: number;
  availableModels?: string[];
  error?: {
    code: string;
    providerId: LLMProviderId;
    message: string;
    details?: Record<string, any>;
  };
}

export const aiSettingsSchema = z.object({
  providerId: z.enum(['openai_compatible', 'openai', 'anthropic', 'gemini']),
  customEndpoint: z.string().optional(),
  modelName: z.string().min(1, 'Обов\'язкове поле'),
  temperature: z.number().min(0).max(2),
  timeoutMs: z.number().min(0),
  maxContextTokens: z.number().min(1000).max(2000000),
  embeddingProvider: z.enum(['fastembed', 'openai']),
  apiKey: z.string().optional().nullable(),
});

export type AISettingsFormValues = z.infer<typeof aiSettingsSchema>;

export const PRESET_MODELS: Record<LLMProviderId, string[]> = {
  openai_compatible: ['Qwen2.5-7B-Instruct', 'Llama-3.1-8B-Instruct', 'Hermes-3-Llama-3.1-8B', 'Mistral-7B-Instruct-v0.3'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro'],
};

export const DEFAULT_ENDPOINTS: Record<LLMProviderId, string> = {
  openai_compatible: 'http://localhost:1234/v1',
  openai: '',
  anthropic: '',
  gemini: '',
};
