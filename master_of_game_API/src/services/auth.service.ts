import { AuthRepository } from '../repositories/auth.repository';
import { HashService } from './hash.service';
import { CONFIG } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { LoginResponse, SessionResponse } from '../types/auth';
import { AuthError, ValidationError } from '../errors/app.errors';

// Simple logger - will be replaced with proper logger later
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

export class AuthService {
  private authRepository: AuthRepository;

  constructor() {
    this.authRepository = new AuthRepository();
  }

  public async register(login: string, password: string): Promise<void> {
    logger.info(`Register attempt for: ${login}`);
    const player = await this.authRepository.findByLogin(login);
    if (player) {
      logger.warn(`Registration failed: User already exists: ${login}`);
      throw new ValidationError('User already exists');
    }

    const { hash, salt } = HashService.hashPassword(password);
    await this.authRepository.createPlayer(login, hash, salt);
    logger.info(`User registered successfully: ${login}`);
  }

  public async login(login: string, password: string): Promise<LoginResponse> {
    logger.info(`Login attempt for: ${login}`);
    const player = await this.authRepository.findByLogin(login);
    
    if (!player || !HashService.verifyPassword(password, player.password_hash, player.salt)) {
      logger.warn(`Login failed: Invalid credentials for: ${login}`);
      throw new AuthError('Invalid login or password');
    }

    const session_id = uuidv4();
    const expires_at = Math.floor(Date.now() / 1000) + CONFIG.SESSION_DURATION_SECONDS;

    await this.authRepository.createSession(session_id, login, expires_at);
    logger.info(`User logged in successfully: ${login}`);

    return { 
      session_id, 
      expires_at, 
      player: { id: player.id, login: player.login } 
    };
  }

  public async getSession(session_id: string): Promise<SessionResponse> {
    const session = await this.authRepository.getSession(session_id);
    if (!session) {
      logger.warn(`Session check failed: Session not found: ${session_id}`);
      throw new AuthError('Session not found');
    }

    if (Date.now() / 1000 > session.expires_at) {
      logger.warn(`Session check failed: Session expired: ${session_id}`);
      throw new AuthError('Session expired');
    }

    const player = await this.authRepository.findByLogin(session.login);
    if (!player) {
      logger.error(`Data inconsistency: Session exists but player data missing for login: ${session.login}`);
      throw new AuthError('Player data not found for session');
    }

    return {
      session,
      player: { id: player.id, login: player.login },
    };
  }
}
