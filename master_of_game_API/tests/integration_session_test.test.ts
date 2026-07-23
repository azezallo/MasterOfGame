import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PersistenceService } from '../src/persistence/persistence_service';
import { SessionMetadataService } from '../src/services/session_metadata.service';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../src/config';

// Define a unique subdirectory for this test file to allow for parallel test execution
const TEST_SUBDIR = 'session_selection';
const TEST_SAVES_DIR = path.resolve(CONFIG.SAVES_DIR, TEST_SUBDIR);

describe('Session Selection Integration Tests', () => {
  let persistence: PersistenceService;
  let metadataService: SessionMetadataService;
  const playerId = 'player_test_integration';
  let sessionIds: string[] = [];

  beforeAll(async () => {
    persistence = new PersistenceService();
    metadataService = new SessionMetadataService();

    // Ensure the unique subdirectory exists
    if (!fs.existsSync(TEST_SAVES_DIR)) {
      fs.mkdirSync(TEST_SAVES_DIR, { recursive: true });
    }

    // Override CONFIG.SAVES_DIR for this test suite
    (CONFIG as any).SAVES_DIR = TEST_SAVES_DIR;

    console.log(`--- Creating 3 sessions in ${TEST_SUBDIR} ---`);
    for (let i = 0; i < 3; i++) {
      const id = await persistence.createSession(playerId, `Game ${i}`, `Hero ${i}`);
      sessionIds.push(id);
    }
  });

  afterAll(async () => {
    // Close all database connections
    PersistenceService.repos.forEach((repo) => {
      repo.close();
    });
    PersistenceService.repos.clear();

    // Wait a bit for connections to release
    await new Promise(resolve => setTimeout(resolve, 200));

    // Cleanup only the specific subdirectory for this test suite
    if (fs.existsSync(TEST_SAVES_DIR)) {
      try {
        // Use recursive delete to clear only the test saves directory for this test
        fs.rmSync(TEST_SAVES_DIR, { recursive: true, force: true });
      } catch (e) {
        console.error(`Failed to cleanup test saves directory ${TEST_SAVES_DIR}: ${e}`);
      }
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
