import { Database } from 'better-sqlite3';
import { CONFIG } from '../config';
import {
  SessionMetadata,
  PlayerState,
  WorldState,
  PlayerStateSchema,
  WorldStateSchema,
  SessionMetadataSchema
} from '../models/session';
import { DatabaseRepository } from './database_repository';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import { SessionMetadataService } from '../services/session_metadata.service';

export interface CombinedSessionState {
  playerState: PlayerState;
  worldState: WorldState;
  metadata: SessionMetadata;
}

export class PersistenceService {
  // Map to store DatabaseRepository instances for each session to support concurrency
  private static repos = new Map<string, DatabaseRepository>();

  /**
   * Creates a new session, initializes the database, and returns the session ID.
   * @param playerId The unique identifier for the player.
   * @returns The unique identifier for the new session.
   */
  public async createSession(playerId: string): Promise<string> {
    const sessionId = uuidv4();

    const repo = new DatabaseRepository();
    await repo.initializeDB(playerId, sessionId);
    
    // Use SessionMetadataService to create initial metadata
    const metadataService = new SessionMetadataService();
    const metadata = await metadataService.createMetadata(playerId, sessionId);
    
    repo.saveMetadata(metadata);
    
    PersistenceService.repos.set(sessionId, repo);
    
    return sessionId;
  }

  /**
   * Loads the complete state of a session.
   * @param sessionId The unique identifier for the session.
   * @returns The combined state of the session, or null if the session doesn't exist.
   */
  public async getSessionState(sessionId: string): Promise<CombinedSessionState | null> {
    const repo = PersistenceService.repos.get(sessionId);
    if (!repo) return null;

    const metadata = repo.loadMetadata();
    if (!metadata) return null;

    const playerState = repo.loadPlayerState();
    const inventory = repo.loadItems();
    const npcs = repo.loadNPCs();

    return {
      playerState: {
        ...playerState,
        inventory: inventory,
      },
      worldState: {
        sessionId,
        mapId: 'default',
        entities: npcs,
        weather: { type: 'clear', intensity: 0 },
      },
      metadata,
    };
  }

  /**
   * Removes a session from the active repository map to prevent memory leaks.
   * @param sessionId The unique identifier for the session.
   */
  public removeSession(sessionId: string): void {
    PersistenceService.repos.delete(sessionId);
  }

  /**
   * Saves the complete state of a session atomically using transactions.
   * @param sessionId The unique identifier for the session.
   * @param state The state object to save.
   */
  public async saveSessionState(sessionId: string, state: any): Promise<void> {
    const repo = PersistenceService.repos.get(sessionId);
    if (!repo) throw new Error(`Session ${sessionId} not found`);

    let validatedPlayerState = null;
    let validatedWorldState = null;
    let validatedMetadata = null;

    try {
      if (state.playerState) {
        validatedPlayerState = PlayerStateSchema.parse(state.playerState);
      }

      if (state.worldState) {
        validatedWorldState = WorldStateSchema.parse(state.worldState);
      }

      if (state.metadata) {
        validatedMetadata = SessionMetadataSchema.parse(state.metadata);
      }
    } catch (error) {
      throw new Error(`Validation failed for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Use transaction to ensure atomicity
    repo.runTransaction((db) => {
      if (validatedPlayerState) {
        repo.savePlayerState(validatedPlayerState, db);
      }

      if (validatedPlayerState && validatedPlayerState.inventory) {
        for (const item of validatedPlayerState.inventory) {
          repo.saveItem(item, db);
        }
      }

      if (validatedWorldState && validatedWorldState.entities) {
        for (const npc of validatedWorldState.entities) {
          repo.saveNPC(npc, db);
        }
      }

      if (validatedMetadata) {
        const metadataToSave = {
          ...validatedMetadata,
          lastPlayedAt: validatedMetadata.lastPlayedAt || Math.floor(Date.now() / 1000)
        };
        repo.saveMetadata(metadataToSave, db);
      }
    });
  }
}
