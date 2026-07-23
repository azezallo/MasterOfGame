import { z } from 'zod';

export const CreateSessionSchema = z.object({
  gameName: z.string().min(1, 'Game name is required'),
  characterName: z.string().min(1, 'Character name is required'),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
