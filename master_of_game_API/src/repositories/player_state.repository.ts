import Database from 'better-sqlite3';
import { PlayerStateProfile } from '../types/player_state.types';
import { PlayerStateProfileSchema } from '../schemas/player_state.schema';

export interface DBPlayerStateRow {
  session_id: string;
  data: string;
  updated_at: number;
}

export const DEFAULT_PLAYER_STATE: PlayerStateProfile = {
  physical_states: [],
  body_states: [],
  psychological_states: [],
  attributes: {
    strength: 25,
    agility: 30,
    endurance: 28,
    perception: 22,
    willpower: 20,
  },
  derived_stats: {
    max_carry_weight_kg: 55.0, // 5.0 + 25 * 2.0
  },
  magic_stats: {
    mana_pool: 100,
    current_mana: 25,
    mana_flow: 5,
    base_regen: 10.0,
  },
  skills: {
    fire_magic: 50,
    sword_fighting: 30,
    stealth: 15,
  },
};

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
      const defaultState = JSON.parse(JSON.stringify(DEFAULT_PLAYER_STATE));
      this.savePlayerState(sessionId, defaultState);
      return defaultState;
    }

    try {
      const parsed = JSON.parse(row.data);
      return PlayerStateProfileSchema.parse(parsed);
    } catch (err) {
      console.error('[PlayerStateRepository] Failed to parse player state data, returning default:', err);
      const defaultState = JSON.parse(JSON.stringify(DEFAULT_PLAYER_STATE));
      this.savePlayerState(sessionId, defaultState);
      return defaultState;
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
