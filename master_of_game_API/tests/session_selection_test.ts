import { PersistenceService } from '../persistence/persistence_service';
import { v4 as uuidv4 } from 'uuid';

async function runTest() {
  const persistence = new PersistenceService();
  const playerId = 'player_test';

  // 1. Create dummy sessions
  const sessionIds = [];
  for (let i = 0; i < 3; i++) {
    const sessionId = uuidv4();
    await persistence.createSession(playerId); // This creates and saves metadata
    // We need the ID that was actually created. 
    // Since createSession doesn't let us pass an ID, let's refine the approach.
  }
}
