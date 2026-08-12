import { z } from 'zod';

export const chatMessageTypeSchema = z.enum(['player', 'master', 'system']);
export type ChatMessageType = z.infer<typeof chatMessageTypeSchema>;

export const gameStatusSchema = z.enum([
  'IDLE',
  'GATHERING_MEMORY',
  'READING_MAP',
  'GENERATING_NARRATIVE',
]);
export type GameStatus = z.infer<typeof gameStatusSchema>;

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  type: chatMessageTypeSchema,
  text: z.string(),
  timestamp: z.string().optional(),
  speaker: z.string().optional(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatStateSchema = z.object({
  messages: z.array(chatMessageSchema),
  status: gameStatusSchema,
  isProcessing: z.boolean(),
});
export type ChatState = z.infer<typeof chatStateSchema>;
