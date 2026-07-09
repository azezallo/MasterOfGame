import { describe, it, expect } from 'vitest';
import { CONFIG } from './src/config';
import { PlayerStateSchema } from './src/models/session';
import { z } from 'zod';

describe('Session Persistence Setup', () => {
  it('should have correct CONFIG', () => {
    expect(CONFIG.SAVES_DIR).toBeDefined();
    expect(typeof CONFIG.SAVES_DIR).toBe('string');
  });

  it('should validate PlayerStateSchema', () => {
    const validPlayer = {
      playerId: 'player-123',
      name: 'Hero',
      level: 1,
      experience: 0,
      health: 100,
      mana: 50,
      attributes: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        vitality: 10,
      },
      inventory: [],
    };
    const result = PlayerStateSchema.safeParse(validPlayer);
    expect(result.success).toBe(true);
  });
});
