import { SessionMetadata } from '../models/session';
import { PersistenceService } from '../persistence/persistence_service';
import { DatabaseRepository } from '../persistence/database_repository';
import { CONFIG } from '../config';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger';
import { PersistenceError } from '../errors/app_errors';

export class SessionMetadataService {
  /**
   * Gets metadata for a specific session.
   * Loads the session database from disk if it is not already in memory.
   */
  public async getMetadata(playerId: string, sessionId: string): Promise<SessionMetadata | null> {
    let repo = PersistenceService.repos.get(sessionId);

    if (!repo) {
      const persistenceService = new PersistenceService();
      repo = (await persistenceService.loadSessionRepo(playerId, sessionId)) || undefined;
    }

    if (repo) {
      const metadata = repo.loadMetadata();
      if (metadata) return metadata;
    }

    return null;
  }

  /**
   * Creates and saves initial metadata for a new session.
   * @param playerId The unique identifier for the player.
   * @param sessionId The unique identifier for the session.
   * @param gameName The name of the game.
   * @param characterName The name of the character.
   * @returns The created metadata.
   */
  public async createMetadata(playerId: string, sessionId: string, gameName: string, characterName: string): Promise<SessionMetadata> {
    const dbPath = path.resolve(CONFIG.SAVES_DIR, playerId, `${sessionId}.db`);
    
    const dbExists = await fs.promises.access(dbPath).then(() => true).catch(() => false);
    if (dbExists) {
      let repo = PersistenceService.repos.get(sessionId);
      
      if (!repo) {
        repo = new DatabaseRepository();
        await repo.initializeDB(playerId, sessionId);
        PersistenceService.repos.set(sessionId, repo);
      }

      const metadata: SessionMetadata = {
        sessionId,
        gameName,
        characterName,
        createdAt: Math.floor(Date.now() / 1000),
        lastPlayedAt: Math.floor(Date.now() / 1000),
        version: 1,
      };

      repo.saveMetadata(metadata);
      logger.info(`Metadata created for session ${sessionId}`);
      return metadata;
    }

    logger.error(`Database for session ${sessionId} not found at ${dbPath}`);
    throw new PersistenceError(`Database for session ${sessionId} not found at ${dbPath}`);
  }

  /**
   * Gets all available sessions for a player.
   * Scans the saves folder and returns all sessions with valid metadata.
   */
  public async getAvailableSessions(playerId: string): Promise<SessionMetadata[]> {
    const playerDir = path.resolve(CONFIG.SAVES_DIR, playerId);
    const dirExists = await fs.promises.access(playerDir).then(() => true).catch(() => false);
    if (!dirExists) {
      return [];
    }

    const files = await fs.promises.readdir(playerDir);
    const dbFiles = files.filter(file => file.endsWith('.db'));
    const sessions: SessionMetadata[] = [];

    for (const file of dbFiles) {
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
