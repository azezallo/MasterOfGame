import { z } from 'zod';

export const SessionCreationSchema = z.object({
  gameName: z.string().min(1).max(255),
  characterName: z.string().min(1).max(255),
  mapSize: z.object({ x: z.number(), y: z.number() }).default({ x: 5, y: 5 }),
});

export type SessionCreationInput = z.infer<typeof SessionCreationSchema>;

export interface SessionCreationState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}
