import { SessionMetadata } from '../models/session';
import { PersistenceService } from '../persistence/persistence_service';
import { DatabaseRepository } from '../persistence/database_repository';
import { CONFIG } from '../config';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class SessionMetadataService {
  private static repos = new Map<string, DatabaseRepository>();

  /**
   * Gets metadata for a specific session.
   * Returns null if metadata does not exist in the database.
   */
  public async getMetadata(playerId: string, sessionId: string): Promise<SessionMetadata | null> {
    const repo = PersistenceService.repos.get(sessionId);
    
    if (repo) {
      const metadata = repo.loadMetadata();
      if (metadata) return metadata;
    }

    return null;
  }

  /**
   * Creates and saves initial metadata for a new session.
   * If player state is not found, it uses default values.
   */
  public async createMetadata(playerId: string, sessionId: string): Promise<SessionMetadata> {
    const dbPath = path.resolve(CONFIG.SAVES_DIR, playerId, `${sessionId}.db`);
    
    if (fs.existsSync(dbPath)) {
      const tempRepo = new DatabaseRepository();
      await tempRepo.initializeDB(playerId, sessionId);
      
      const playerState = tempRepo.loadPlayerState();
      let gameName = 'New Game';
      let characterName = 'Hero';

      if (playerState) {
        gameName = playerState.name || 'New Game';
        characterName = playerState.name || 'Hero';
      }

      const metadata: SessionMetadata = {
        sessionId,
        gameName,
        characterName,
        createdAt: Math.floor(Date.now() / 1000),
        lastPlayedAt: Math.floor(Date.now() / 1000),
        version: 1,
      };

      tempRepo.saveMetadata(metadata);
      PersistenceService.repos.set(sessionId, tempRepo);
      return metadata;
    }

    throw new Error(`Database for session ${sessionId} not found at ${dbPath}`);
  }

  /**
   * Gets all available sessions for a player.
   * Scans the saves folder and returns only sessions that have valid metadata in the database.
   */
  public async getAvailableSessions(playerId: string): Promise<SessionMetadata[]> {
    const playerDir = path.resolve(CONFIG.SAVES_DIR, playerId);
    if (!fs.existsSync(playerDir)) {
      return [];
    }

    const files = fs.readdirSync(playerDir).filter(file => file.endsWith('.db'));
    const sessions: SessionMetadata[] = [];

    for (const file of files) {
      const sessionId = path.basename(file, '.db');
      const metadata = await this.getMetadata(playerId, sessionId);
      if (metadata) {
        sessions.push(metadata);
      }
    }

    return sessions;
  }

  /**
   * Updates the last played timestamp for a session.
   */
  public async updateLastPlayedAt(playerId: string, sessionId: string): Promise<SessionMetadata | null> {
    const metadata = await this.getMetadata(playerId, sessionId);
    if (metadata) {
      metadata.lastPlayedAt = Math.floor(Date.now() / 1000);
      const repo = PersistenceService.repos.get(sessionId);
      if (repo) {
        repo.saveMetadata(metadata);
        return metadata;
      }
    }
    return null;
  }
}
