import Database from 'better-sqlite3';
import { SemanticMemoryRecord, MemoryRole, WorldTimeRange } from '../types/semantic_memory.types';
import { EmbeddingService } from '../services/embedding.service';

export interface DBSemanticHistoryRow {
  id: number;
  session_id: string;
  turn_number: number;
  role: string;
  content: string;
  embedding: Buffer;
  tags: string;
  world_time: string | null;
  created_at: string;
}

function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

export class SemanticMemoryRepository {
  private db: Database.Database;
  private embeddingService: EmbeddingService;

  constructor(db: Database.Database, embeddingService?: EmbeddingService) {
    this.db = db;
    this.embeddingService = embeddingService || new EmbeddingService();
    this.createTable();
  }

  private createTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS semantic_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('player', 'master', 'system')),
        content TEXT NOT NULL,
        embedding BLOB NOT NULL,
        tags TEXT DEFAULT '[]',
        world_time TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_semantic_history_session_id ON semantic_history(session_id);
    `);
  }

  public insertRecord(record: {
    session_id: string;
    turn_number: number;
    role: MemoryRole;
    content: string;
    embedding: Float32Array | Buffer;
    tags?: string[];
    world_time?: string | null;
  }): SemanticMemoryRecord {
    const tagsJson = JSON.stringify(record.tags || []);
    const embeddingBuffer = record.embedding instanceof Float32Array
      ? Buffer.from(record.embedding.buffer, record.embedding.byteOffset, record.embedding.byteLength)
      : record.embedding;

    const stmt = this.db.prepare(`
      INSERT INTO semantic_history (session_id, turn_number, role, content, embedding, tags, world_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      record.session_id,
      record.turn_number,
      record.role,
      record.content,
      embeddingBuffer,
      tagsJson,
      record.world_time || null
    );

    const insertedId = Number(result.lastInsertRowid);
    return this.getRecordById(insertedId)!;
  }

  public getRecordById(id: number): SemanticMemoryRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM semantic_history WHERE id = ?`);
    const row = stmt.get(id) as DBSemanticHistoryRow | undefined;
    if (!row) return null;

    return this.mapRowToRecord(row);
  }

  private bufferToFloat32Array(buf: Buffer): Float32Array {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return new Float32Array(ab);
  }

  public searchByVector(
    sessionId: string,
    queryVector: Float32Array,
    options?: {
      tagsFilter?: string[];
      roleFilter?: MemoryRole;
      worldTimeRange?: WorldTimeRange;
      limit?: number;
    }
  ): Array<SemanticMemoryRecord & { score: number }> {
    let sql = `SELECT * FROM semantic_history WHERE session_id = ?`;
    const params: any[] = [sessionId];

    if (options?.roleFilter) {
      sql += ` AND role = ?`;
      params.push(options.roleFilter);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as DBSemanticHistoryRow[];

    const scoredRecords: Array<SemanticMemoryRecord & { score: number }> = [];

    for (const row of rows) {
      const recordTags: string[] = safeJsonParse(row.tags, []);

      // Filter by Tags
      if (options?.tagsFilter && options.tagsFilter.length > 0) {
        const matchesTags = options.tagsFilter.every(tag => recordTags.includes(tag));
        if (!matchesTags) continue;
      }

      // Filter by World Time Range
      if (options?.worldTimeRange) {
        if (!row.world_time) continue;
        if (options.worldTimeRange.start && row.world_time < options.worldTimeRange.start) {
          continue;
        }
        if (options.worldTimeRange.end && row.world_time > options.worldTimeRange.end) {
          continue;
        }
      }

      const recordVector = this.bufferToFloat32Array(row.embedding);

      const score = this.embeddingService.cosineSimilarity(queryVector, recordVector);
      const record = this.mapRowToRecord(row);

      scoredRecords.push({ ...record, score });
    }

    // Sort descending by similarity score
    scoredRecords.sort((a, b) => b.score - a.score);

    const limit = options?.limit ?? 3;
    return scoredRecords.slice(0, limit);
  }

  private mapRowToRecord(row: DBSemanticHistoryRow): SemanticMemoryRecord {
    const floatArray = this.bufferToFloat32Array(row.embedding);

    return {
      id: row.id,
      session_id: row.session_id,
      turn_number: row.turn_number,
      role: row.role as MemoryRole,
      content: row.content,
      embedding: floatArray,
      tags: safeJsonParse(row.tags, []),
      world_time: row.world_time,
      created_at: row.created_at,
    };
  }
}
