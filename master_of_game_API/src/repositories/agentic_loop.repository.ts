import Database from 'better-sqlite3';
import { ShortLog, SessionSummary, LongContextMessage } from '../types/agentic_loop.types';

export class AgenticLoopRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.createTables();
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS short_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_compressed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_short_logs_session ON short_logs(session_id, is_compressed);

      CREATE TABLE IF NOT EXISTS long_context (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('player', 'master')),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_long_context_session ON long_context(session_id);

      CREATE TABLE IF NOT EXISTS session_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        compressed_until_turn INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_session_summaries_session ON session_summaries(session_id);
    `);
  }

  public getLatestSummary(sessionId: string): SessionSummary | null {
    const stmt = this.db.prepare(`SELECT * FROM session_summaries WHERE session_id = ? ORDER BY id DESC LIMIT 1`);
    const row = stmt.get(sessionId) as SessionSummary | undefined;
    return row || null;
  }

  public saveSessionSummary(sessionId: string, summaryText: string, compressedUntilTurn: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO session_summaries (session_id, summary_text, compressed_until_turn)
      VALUES (?, ?, ?)
    `);
    stmt.run(sessionId, summaryText, compressedUntilTurn);
  }

  public getUncompressedShortLogs(sessionId: string): ShortLog[] {
    const stmt = this.db.prepare(`SELECT * FROM short_logs WHERE session_id = ? AND is_compressed = 0 ORDER BY turn_number ASC`);
    return (stmt.all(sessionId) as ShortLog[]) || [];
  }

  public markShortLogsCompressed(logIds: number[]): void {
    if (logIds.length === 0) return;
    const placeholders = logIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`UPDATE short_logs SET is_compressed = 1 WHERE id IN (${placeholders})`);
    stmt.run(...logIds);
  }

  public saveShortLog(sessionId: string, turnNumber: number, content: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO short_logs (session_id, turn_number, content)
      VALUES (?, ?, ?)
    `);
    stmt.run(sessionId, turnNumber, content);
  }

  public getRecentLongContext(sessionId: string, limit: number): LongContextMessage[] {
    const stmt = this.db.prepare(`SELECT * FROM long_context WHERE session_id = ? ORDER BY id DESC LIMIT ?`);
    const rows = (stmt.all(sessionId, limit) as LongContextMessage[]) || [];
    return rows.reverse();
  }

  public getAllLongContext(sessionId: string): LongContextMessage[] {
    const stmt = this.db.prepare(`SELECT * FROM long_context WHERE session_id = ? ORDER BY id ASC`);
    return (stmt.all(sessionId) as LongContextMessage[]) || [];
  }

  public saveLongContextMessage(sessionId: string, turnNumber: number, role: 'player' | 'master', content: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO long_context (session_id, turn_number, role, content)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(sessionId, turnNumber, role, content);
  }

  public getNextTurnNumber(sessionId: string): number {
    const stmt = this.db.prepare(`SELECT MAX(turn_number) as max_turn FROM short_logs WHERE session_id = ?`);
    const row = stmt.get(sessionId) as { max_turn: number } | undefined;
    return (row?.max_turn || 0) + 1;
  }
}
