import Database from 'better-sqlite3';
import { CONFIG } from '../config';

interface DBPlayerRow {
  id: number;
  login: string;
  password_hash: string;
  salt: string;
}

interface DBSessionRow {
  session_id: string;
  login: string;
  expires_at: number;
}

export class AuthRepository {
  private db: Database.Database;

  constructor() {
    this.db = new Database(CONFIG.DATABASE_PATH);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        login TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY(login) REFERENCES players(login)
      );
    `);
  }

  public findByLogin(login: string): { id: number; login: string; password_hash: string; salt: string } | null {
    const stmt = this.db.prepare('SELECT * FROM players WHERE login = ?');
    const row = stmt.get(login) as DBPlayerRow | undefined;
    return row ? { id: row.id, login: row.login, password_hash: row.password_hash, salt: row.salt } : null;
  }

  public createPlayer(login: string, password_hash: string, salt: string): number | bigint {
    const stmt = this.db.prepare('INSERT INTO players (login, password_hash, salt) VALUES (?, ?, ?)');
    return stmt.run(login, password_hash, salt).lastInsertRowid;
  }

  public createSession(session_id: string, login: string, expires_at: number): number | bigint {
    const stmt = this.db.prepare('INSERT INTO sessions (session_id, login, expires_at) VALUES (?, ?, ?)');
    return stmt.run(session_id, login, expires_at).lastInsertRowid;
  }

  public getSession(session_id: string): { session_id: string; login: string; expires_at: number } | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE session_id = ?');
    const row = stmt.get(session_id) as DBSessionRow | undefined;
    return row ? { session_id: row.session_id, login: row.login, expires_at: row.expires_at } : null;
  }

  public close(): void {
    this.db.close();
  }
}
