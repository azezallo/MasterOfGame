import fs from 'fs';
import path from 'path';
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
import { MapGeneratorService } from '../services/map_generator.service';
import { PersistenceError, ValidationError } from '../errors/app_errors';

export interface CombinedSessionState {
  playerState: PlayerState;
  worldState: WorldState;
  metadata: SessionMetadata;
}

export class PersistenceService {
  // Map to store DatabaseRepository instances for each session to support concurrency
  public static repos = new Map<string, DatabaseRepository>();

  /**
   * Creates a new session, initializes the database, and returns the session ID.
   * @param playerId The unique identifier for the player.
   * @param gameName The name of the game.
   * @param characterName The name of the character.
   * @param mapSize The size of the map to generate.
   * @returns The unique identifier for the new session.
   */
  public async createSession(playerId: string, gameName: string, characterName: string, mapSize: { x: number, y: number } = { x: 5, y: 5 }): Promise<string> {
    const sessionId = uuidv4();

    try {
      const repo = new DatabaseRepository();
      await repo.initializeDB(playerId, sessionId);
      
      // Use SessionMetadataService to create initial metadata
      const metadataService = new SessionMetadataService();
      const metadata = await metadataService.createMetadata(playerId, sessionId, gameName, characterName);
      
      repo.saveMetadata(metadata);
      
      // Generate the initial world map
      const mapGenerator = new MapGeneratorService(repo);
      await mapGenerator.generateWorld(mapSize);
      
      PersistenceService.repos.set(sessionId, repo);
      
      logger.info(`Session ${sessionId} created for player ${playerId}`);
      return sessionId;
    } catch (error) {
      logger.error(`Failed to create session for player ${playerId}: ${error}`);
      throw new PersistenceError(`Failed to create session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Loads the session repository into memory if it exists on disk.
   * @param playerId The unique identifier for the player.
   * @param sessionId The unique identifier for the session.
   * @returns The DatabaseRepository instance or null if it doesn't exist.
   */
  public async loadSessionRepo(playerId: string, sessionId: string): Promise<DatabaseRepository | null> {
    let repo = PersistenceService.repos.get(sessionId);
    if (repo) return repo;

    const dbPath = path.resolve(CONFIG.SAVES_DIR, playerId, `${sessionId}.db`);
    
    let dbExists = false;
    try {
      await fs.promises.access(dbPath);
      dbExists = true;
    } catch {
      console.log(`[PersistenceService] Session DB not found at ${dbPath}`);
    }
    
    if (dbExists) {
      repo = new DatabaseRepository();
      await repo.initializeDB(playerId, sessionId);
      PersistenceService.repos.set(sessionId, repo);
      return repo;
    }

    return null;
  }

  /**
   * Loads the complete state of a session.
   * @param sessionId The unique identifier for the session.
   * @returns The combined state of the session, or null if the session doesn't exist.
   */
  public async getSessionState(sessionId: string): Promise<CombinedSessionState | null> {
    const repo = PersistenceService.repos.get(sessionId);
    if (!repo) return null;

    try {
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
    } catch (error) {
      logger.error(`Error loading session state for ${sessionId}: ${error}`);
      throw new PersistenceError(`Error loading session state: ${error instanceof Error ? error.message : String(error)}`);
    }
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
  public async saveSessionState(sessionId: string, state: {
    playerState: PlayerState;
    worldState: WorldState;
    metadata: SessionMetadata;
  }): Promise<void> {
    const repo = PersistenceService.repos.get(sessionId);
    if (!repo) throw new PersistenceError(`Session ${sessionId} not found`);

    try {
      let validatedPlayerState: PlayerState | null = null;
      let validatedWorldState: WorldState | null = null;
      let validatedMetadata: SessionMetadata | null = null;

      if (state.playerState) {
        validatedPlayerState = PlayerStateSchema.parse(state.playerState);
      }

      if (state.worldState) {
        validatedWorldState = WorldStateSchema.parse(state.worldState);
      }

      if (state.metadata) {
        validatedMetadata = SessionMetadataSchema.parse(state.metadata);
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
      
      logger.info(`Session ${sessionId} state saved successfully`);
    } catch (error) {
      logger.error(`Error saving session state for ${sessionId}: ${error}`);
      if (error instanceof ValidationError) {
        throw new ValidationError(error.message);
      }
      throw new PersistenceError(`Error saving session state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
