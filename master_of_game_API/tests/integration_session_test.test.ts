import { describe, it, expect, beforeAll } from 'vitest';
import { PersistenceService } from '../src/persistence/persistence_service';
import { SessionMetadataService } from '../src/services/session_metadata.service';

describe('Session Selection Integration Tests', () => {
  let persistence: PersistenceService;
  let metadataService: SessionMetadataService;
  const playerId = 'player_test_integration';
  let sessionIds: string[] = [];

  beforeAll(async () => {
    persistence = new PersistenceService();
    metadataService = new SessionMetadataService();

    console.log('--- Creating 3 sessions ---');
    for (let i = 0; i < 3; i++) {
      const id = await persistence.createSession(playerId);
      sessionIds.push(id);
    }
  });

  it('should get available sessions', async () => {
    const sessions = await metadataService.getAvailableSessions(playerId);
    expect(sessions.length).toBe(3);
    sessions.forEach(s => {
      expect(s).toHaveProperty('gameName');
      expect(s).toHaveProperty('characterName');
    });
  });

  it('should update lastPlayedAt on write operation', async () => {
    const targetSessionId = sessionIds[0];
    const mockState = {
      playerState: {
        playerId: 'test-player-id',
        name: 'TestHero',
        level: 10,
        experience: 100,
        health: 100,
        mana: 50,
        attributes: { strength: 10, agility: 10, intelligence: 10, vitality: 10 },
        inventory: []
      },
      worldState: {
        sessionId: targetSessionId,
        mapId: 'test_map',
        entities: [],
        weather: { type: 'clear', intensity: 0 }
      },
      metadata: {
        sessionId: targetSessionId,
        gameName: 'TestGame',
        characterName: 'TestCharacter',
        createdAt: Math.floor(Date.now() / 1000),
        lastPlayedAt: Math.floor(Date.now() / 1000),
        version: 1
      }
    };

    await persistence.saveSessionState(targetSessionId, mockState);
    const updatedMetadata = await metadataService.getMetadata(playerId, targetSessionId);

    expect(updatedMetadata).not.toBeNull();
    expect(updatedMetadata.lastPlayedAt).toBeGreaterThan(0);
  });
});