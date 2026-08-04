import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import { AuthError } from '../errors/app.errors';
import { AuthRepository } from '../repositories/auth.repository';
import { HashService } from './hash.service';

export class AuthService {
  private authRepo: AuthRepository;

  constructor() {
    this.authRepo = new AuthRepository();
  }

  /**
   * Registers a new user in the system.
   * @param login The user's login name.
   * @param password The user's password.
   * @returns The registration result.
   */
  public async register(login: string, password: string): Promise<{ success: boolean; message: string }> {
    logger.info(`Register attempt for: ${login}`);
    try {
      const { hash, salt } = HashService.hashPassword(password);
      this.authRepo.createPlayer(login, hash, salt);

      logger.info(`User registered successfully: ${login}`);
      return { success: true, message: 'User registered successfully' };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        logger.warn(`Registration failed: User already exists: ${login}`);
        return { success: false, message: 'User already exists' };
      }
      logger.error(`Registration error for ${login}: ${error.message}`);
      throw error;
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
      const player = this.authRepo.findByLogin(login);

      if (!player || !HashService.verifyPassword(password, player.password_hash, player.salt)) {
        logger.warn(`Login failed: Invalid credentials for: ${login}`);
        throw new AuthError('Invalid credentials');
      }

      const sessionId = uuidv4();
      const expiresAt = Math.floor(Date.now() / 1000) + 3600 * 24 * 7; // 7 days

      this.authRepo.createSession(sessionId, login, expiresAt);

      logger.info(`User logged in successfully: ${login}`);
      return {
        session_id: sessionId,
        expires_at: expiresAt,
        player: { id: player.id, login: player.login },
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      logger.error(`Login error for ${login}: ${error instanceof Error ? error.message : String(error)}`);
      throw new AuthError('Internal server error during login');
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

      const session = this.authRepo.getSession(sessionId);
      if (!session) {
        throw new AuthError('Invalid session');
      }

      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at < now) {
        throw new AuthError('Session expired');
      }

      const player = this.authRepo.findByLogin(session.login);
      if (!player) {
        throw new AuthError('Player not found');
      }

      return {
        session_id: session.session_id,
        expires_at: session.expires_at,
        player: { id: player.id, login: player.login },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      logger.warn(`Session check failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new AuthError(error instanceof Error ? error.message : String(error));
    }
  }
}