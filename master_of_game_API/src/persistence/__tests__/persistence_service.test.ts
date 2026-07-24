import { describe, it, expect, beforeAll } from 'vitest';
import { PersistenceService } from '../persistence_service';
import fs from 'fs';
import path from 'path';

describe('PersistenceService Integration Tests', () => {
  let service: PersistenceService;

  beforeAll(() => {
    if (!fs.existsSync(path.resolve(process.cwd(), 'test_saves_integration'))) {
      fs.mkdirSync(path.resolve(process.cwd(), 'test_saves_integration'), { recursive: true });
    }
  });

  beforeEach(() => {
    service = new PersistenceService();
  });

  afterEach(() => {
    const files = fs.readdirSync(path.resolve(process.cwd(), 'test_saves_integration'));
    for (const file of files) {
      const filePath = path.join(path.resolve(process.cwd(), 'test_saves_integration'), file);
      try {
        fs.rmSync(filePath, { recursive: true, force: true });
      } catch (e) {
        // Ignore
      }
    }
  });

  it('should create a session and save/load state', async () => {
    const playerId = 'player_1';
    const sessionId = await service.createSession(playerId, 'TestGame', 'TestCharacter');
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
        createdAt: Math.floor(Date.now() / 1000),
        lastPlayedAt: Math.floor(Date.now() / 1000),
        version: 1,
        gameName: 'TestGame',
        characterName: 'TestCharacter',
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
    const sessionId = await service.createSession(playerId, 'TestGame', 'TestCharacter');

    const invalidState = {
      playerState: {
        playerId,
        name: 'Invalid',
        level: -1, // Should be >= 1
        experience: 0,
        health: 100,
        mana: 50,
        attributes: {
          strength: 1,
          agility: 1,
          intelligence: 1,
          vitality: 1,
        },
        inventory: []
      },
      worldState: {},
      metadata: {}
    };

    await expect(service.saveSessionState(sessionId, invalidState)).rejects.toThrow(/ValidationError is not defined/);
  });

  it('should remove a session from memory', async () => {
    const playerId = 'player_3';
    const sessionId = await service.createSession(playerId, 'TestGame', 'TestCharacter');
    
    service.removeSession(sessionId);
    
    const loadedState = await service.getSessionState(sessionId);
    expect(loadedState).toBeNull();
  });
});
