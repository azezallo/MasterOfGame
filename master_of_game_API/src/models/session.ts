import { z } from 'zod';

export const SessionMetadataSchema = z.object({
  sessionId: z.string().uuid(), // Unique identifier
  gameName: z.string().min(1),           // Name of the game/world
  characterName: z.string().min(1),      // Character name in this session
  createdAt: z.number().int(),    // Unix timestamp of creation
  lastPlayedAt: z.number().int().default(() => Math.floor(Date.now() / 1000)), // Unix timestamp of last play
  version: z.number().default(1),
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

export const PlayerStateSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  level: z.number().min(1),
  experience: z.number().min(0),
  health: z.number().min(0),
  mana: z.number().min(0),
  attributes: z.object({
    strength: z.number().min(0),
    agility: z.number().min(0),
    intelligence: z.number().min(0),
    vitality: z.number().min(0),
  }),
  inventory: z.array(z.object({
    itemId: z.string(),
    quantity: z.number().min(0),
    metadata: z.record(z.any()).optional(),
  })).default([]),
});

export type PlayerState = z.infer<typeof PlayerStateSchema>;

export const WorldStateSchema = z.object({
  sessionId: z.string().uuid(),
  mapId: z.string(),
  entities: z.array(z.object({
    entityId: z.string(),
    type: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
    data: z.record(z.any()).optional(),
  })).default([]),
  weather: z.object({
    type: z.string(),
    intensity: z.number().min(0),
  }).default({ type: 'clear', intensity: 0 }),
});

export type WorldState = z.infer<typeof WorldStateSchema>;
