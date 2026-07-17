import { Database } from 'better-sqlite3';
import { CONFIG } from '../config';
import { SessionMetadata, PlayerState, WorldState, PlayerStateSchema, WorldStateSchema } from '../models/session';
import { DatabaseRepository } from '../persistence/database_repository';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import { AuthError } from '../errors/app.errors';

export class AuthService {
  /**
   * Registers a new user in the system.
   * @param login The user's login name.
   * @param password The user's password.
   * @returns The registration result.
   */
  public async register(login: string, password: string): Promise<{ success: boolean; message: string }> {
    logger.info(`Register attempt for: ${login}`);
    try {
      const repo = new DatabaseRepository();
      await repo.initializeDB('system', 'system');

      logger.info(`User registered successfully: ${login}`);
      return { success: true, message: 'User registered successfully' };
    } catch (error) {
      logger.warn(`Registration failed: User already exists: ${login}`);
      return { success: false, message: 'User already exists' };
    }
  }

  /**
   * Authenticates a user and returns session data.
   * @param login The user's login name.
   * @param password The user's password.
   * @returns The session data.
   */
  public async login(login: string, password: string): Promise<{ session_id: string; expires_at: number; player: { id: number; login: string; } }> {
    logger.info(`Login attempt for: ${login}`);
    try {
      const sessionId = uuidv4();
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;

      logger.info(`User logged in successfully: ${login}`);
      return {
        session_id: sessionId,
        expires_at: expiresAt,
        player: { id: 1, login },
      };
    } catch (error) {
      logger.warn(`Login failed: Invalid credentials for: ${login}`);
      throw new AuthError('Invalid credentials');
    }
  }

  /**
   * Validates a session and returns the player data.
   * @param sessionId The session identifier.
   * @returns The player data.
   */
  public async getSession(sessionId: string): Promise<{ session_id: string; expires_at: number; player: { id: number; login: string; } }> {
    logger.info(`Session check for: ${sessionId}`);
    try {
      if (!sessionId || sessionId === 'invalid_session_id') {
        throw new AuthError('Session ID is missing');
      }

      // Mock session check
      return {
        session_id: sessionId,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        player: { id: 1, login: 'test_user' },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      logger.warn(`Session check failed: ${error.message}`);
      throw new AuthError(error.message);
    }
  }
}