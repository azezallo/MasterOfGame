import { PersistenceService } from '../persistence/persistence_service';
import { SessionMetadataService } from '../services/session_metadata.service';
import { CONFIG } from '../config';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

async function testSessionCreation() {
  const playerId = 'test-player-123';
  const gameName = 'My Awesome Game';
  const characterName = 'Heroic Warrior';

  // Cleanup
  const playerDir = path.resolve(CONFIG.SAVES_DIR, playerId);
  if (fs.existsSync(playerDir)) {
    fs.rmSync(playerDir, { recursive: true });
  }

  try {
    const persistenceService = new PersistenceService();
    const metadataService = new SessionMetadataService();

    const sessionId = await persistenceService.createSession(playerId, gameName, characterName);
    logger.info(`Created session with ID: ${sessionId}`);

    // Verify file exists
    const dbPath = path.resolve(CONFIG.SAVES_DIR, playerId, `${sessionId}.db`);
    if (fs.existsSync(dbPath)) {
      logger.info(`Database file exists at: ${dbPath}`);
    } else {
      logger.error(`Database file DOES NOT exist at: ${dbPath}`);
      process.exit(1);
    }

    // Verify metadata
    const metadata = await metadataService.getMetadata(playerId, sessionId);
    if (metadata && metadata.gameName === gameName && metadata.characterName === characterName) {
      logger.info(`Metadata verified: gameName=${metadata.gameName}, characterName=${metadata.characterName}`);
    } else {
      logger.error(`Metadata verification failed:`, metadata);
      process.exit(1);
    }

    logger.info('Test passed successfully!');
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

testSessionCreation();
