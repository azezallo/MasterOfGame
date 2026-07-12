import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PersistenceService } from '../persistence_service';
import fs from 'fs';
import path from 'path';

const TEST_SAVES_DIR = path.resolve(process.cwd(), 'test_saves_integration');

describe('PersistenceService Integration Tests', () => {
  let service: PersistenceService;

  beforeAll(() => {
    if (!fs.existsSync(TEST_SAVES_DIR)) {
      fs.mkdirSync(TEST_SAVES_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_SAVES_DIR)) {
      try {
        fs.rmSync(TEST_SAVES_DIR, { recursive: true, force: true });
      } catch (e) {
        // Ignore permission errors
      }
    }
  });

  beforeEach(() => {
    service = new PersistenceService();
  });

  afterEach(() => {
    // Clean up any leftover files
    const files = fs.readdirSync(TEST_SAVES_DIR);
    for (const file of files) {
      const filePath = path.join(TEST_SAVES_DIR, file);
      try {
        fs.rmSync(filePath, { recursive: true, force: true });
      } catch (e) {
        // Ignore
      }
    }
  });

  it('should create a session and save/load state', async () => {
    const playerId = 'player_1';
    const sessionId = await service.createSession(playerId);
    expect(sessionId).toBeDefined();

    const state = {
      playerState: {
        playerId,
        name: 'Hero',
        level: 1,
        experience: 0,
        health: 100,
        mana: 50,
        attributes: { strength: 10, agility: 10, intelligence: 10, vitality: 10 },
        inventory: [
          { itemId: 'sword-1', quantity: 1, metadata: { damage: 10 } },
          { itemId: 'potion-1', quantity: 5, metadata: { healing: 50 } }
        ]
      },
      worldState: {
        sessionId,
        mapId: 'forest-1',
        entities: [
          { entityId: 'npc-1', type: 'merchant', position: { x: 10, y: 20, z: 30 }, data: { name: 'Merchant' } }
        ],
        weather: { type: 'clear', intensity: 0 }
      },
      metadata: {
        sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      }
    };

    await service.saveSessionState(sessionId, state);

    const loadedState = await service.getSessionState(sessionId);
    expect(loadedState).not.toBeNull();
    expect(loadedState?.playerState.name).toBe('Hero');
    expect(loadedState?.playerState.inventory).toHaveLength(2);
    expect(loadedState?.worldState.entities).toHaveLength(1);
    expect(loadedState?.metadata.sessionId).toBe(sessionId);
  });

  it('should fail to save state with invalid data', async () => {
    const playerId = 'player_2';
    const sessionId = await service.createSession(playerId);

    const invalidState = {
      playerState: {
        playerId,
        name: 'Invalid',
        level: -1, // Should be >= 1
        experience: 0,
        health: 100,
        mana: 50,
        attributes: {},
        inventory: []
      },
      worldState: {},
      metadata: {}
    };

    await expect(service.saveSessionState(sessionId, invalidState)).rejects.toThrow('Validation failed');
  });

  it('should remove a session from memory', async () => {
    const playerId = 'player_3';
    const sessionId = await service.createSession(playerId);
    
    service.removeSession(sessionId);
    
    const loadedState = await service.getSessionState(sessionId);
    expect(loadedState).toBeNull();
  });
});
