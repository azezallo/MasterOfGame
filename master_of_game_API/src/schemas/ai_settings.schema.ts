import { z } from 'zod';

export const ProviderIdSchema = z.enum(['openai_compatible', 'openai', 'anthropic', 'gemini']);
export const EmbeddingProviderSchema = z.enum(['fastembed', 'openai']);

export const UpdateAISettingsSchema = z.object({
  providerId: ProviderIdSchema,
  customEndpoint: z
    .string()
    .refine((val) => !val || /^https?:\/\/.+/.test(val), {
      message: 'Base URL must start with http:// or https://',
    })
    .optional()
    .nullable(),
  modelName: z.string().min(1, 'Model name is required'),
  temperature: z.number().min(0).max(2).default(0.7),
  timeoutMs: z.number().min(0).default(0),
  maxContextTokens: z.number().min(1000).max(2000000).default(32000),
  embeddingProvider: EmbeddingProviderSchema,
  apiKey: z.string().optional().nullable(),
});

export const TestConnectionSchema = z.object({
  providerId: ProviderIdSchema,
  customEndpoint: z
    .string()
    .refine((val) => !val || /^https?:\/\/.+/.test(val), {
      message: 'Base URL must start with http:// or https://',
    })
    .optional()
    .nullable(),
  apiKey: z.string().optional().nullable(),
});
