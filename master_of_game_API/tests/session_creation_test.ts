import { PersistenceService } from './src/persistence/persistence_service';
import { SessionMetadataService } from './src/services/session_metadata.service';
import { CONFIG } from './src/config';
import fs from 'fs';
import path from 'path';

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
    console.log(`Created session with ID: ${sessionId}`);

    // Verify file exists
    const dbPath = path.resolve(CONFIG.SAVES_DIR, playerId, `${sessionId}.db`);
    if (fs.existsSync(dbPath)) {
      console.log(`Database file exists at: ${dbPath}`);
    } else {
      console.error(`Database file DOES NOT exist at: ${dbPath}`);
      process.exit(1);
    }

    // Verify metadata
    const metadata = await metadataService.getMetadata(playerId, sessionId);
    if (metadata && metadata.gameName === gameName && metadata.characterName === characterName) {
      console.log(`Metadata verified: gameName=${metadata.gameName}, characterName=${metadata.characterName}`);
    } else {
      console.error(`Metadata verification failed:`, metadata);
      process.exit(1);
    }

    console.log('Test passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testSessionCreation();
