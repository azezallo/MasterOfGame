import { z } from 'zod';

export const SessionCreationSchema = z.object({
  gameName: z.string().min(1).max(255),
  characterName: z.string().min(1).max(255),
});

export type SessionCreationInput = z.infer<typeof SessionCreationSchema>;

export interface SessionCreationState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}
