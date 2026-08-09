import { z } from 'zod';

export const CreateSessionSchema = z.object({
  gameName: z.string().min(1, 'Game name is required'),
  characterName: z.string().min(1, 'Character name is required'),
  mapSize: z.object({ x: z.number(), y: z.number() }).default({ x: 5, y: 5 }),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
