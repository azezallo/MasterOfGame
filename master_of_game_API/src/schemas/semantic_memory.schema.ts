import { z } from 'zod';

export const CreateMemoryRecordSchema = z.object({
  session_id: z.string().min(1, 'session_id is required'),
  turn_number: z.number().int().min(0, 'turn_number must be a non-negative integer'),
  role: z.enum(['player', 'master', 'system']),
  content: z.string().min(1, 'content is required'),
  tags: z.array(z.string()).optional().default([]),
  world_time: z.string().nullable().optional(),
});

export type CreateMemoryRecordInput = z.infer<typeof CreateMemoryRecordSchema>;

export const SearchMemoryQuerySchema = z.object({
  session_id: z.string().min(1, 'session_id is required'),
  query: z.string().min(1, 'query is required'),
  tags_filter: z.array(z.string()).optional(),
  role_filter: z.enum(['player', 'master', 'system']).optional(),
  world_time_range: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  limit: z.number().int().positive().optional().default(3),
});

export type SearchMemoryQueryInput = z.infer<typeof SearchMemoryQuerySchema>;
