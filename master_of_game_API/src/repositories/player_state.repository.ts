import Database from 'better-sqlite3';
import { PlayerStateProfile } from '../types/player_state.types';
import { PlayerStateProfileSchema } from '../schemas/player_state.schema';
import { getInitialPlayerStatePreset } from '../config';
import { logger } from '../logger';

export interface DBPlayerStateRow {
  session_id: string;
  data: string;
  updated_at: number;
}

export class PlayerStateRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureTableExists();
  }

  private ensureTableExists(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_state (
        session_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );
    `);
  }

  public getPlayerState(sessionId: string): PlayerStateProfile {
    const stmt = this.db.prepare(`SELECT * FROM player_state WHERE session_id = ?`);
    const row = stmt.get(sessionId) as DBPlayerStateRow | undefined;

    if (!row) {
      const defaultPreset = getInitialPlayerStatePreset() as PlayerStateProfile;
      this.savePlayerState(sessionId, defaultPreset);
      return defaultPreset;
    }

    try {
      const parsed = JSON.parse(row.data);
      return PlayerStateProfileSchema.parse(parsed);
    } catch (err) {
      logger.error('[PlayerStateRepository] Failed to parse player state data, returning default preset:', err);
      const defaultPreset = getInitialPlayerStatePreset() as PlayerStateProfile;
      this.savePlayerState(sessionId, defaultPreset);
      return defaultPreset;
    }
  }

  public savePlayerState(sessionId: string, state: PlayerStateProfile): void {
    const now = Math.floor(Date.now() / 1000);
    const dataStr = JSON.stringify(state);

    const stmt = this.db.prepare(`
      INSERT INTO player_state (session_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `);

    stmt.run(sessionId, dataStr, now);
  }
}
