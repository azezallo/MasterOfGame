import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config';
import { SessionMetadata } from '../models/session';

export class DatabaseRepository {
  private db: Database | null = null;
  private sessionId?: string;
  private playerId?: string;

  /**
   * Initializes the database for a specific session.
   * Creates a new .db file in the saves directory with player-specific folder structure.
   * @param playerId The unique identifier for the player.
   * @param sessionId The unique identifier for the session.
   */
  public async initializeDB(playerId: string, sessionId: string): Promise<void> {
    this.playerId = playerId;
    this.sessionId = sessionId;
    const dbPath = path.resolve(CONFIG.SAVES_DIR, playerId, `${sessionId}.db`);
    
    // Ensure the player directory exists
    const dirPath = path.dirname(dbPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // better-sqlite3 is synchronous in its connection, 
    // but we'll wrap it to maintain a consistent async API if needed.
    this.db = new Database(dbPath);

    this.createTables();
  }

  private createTables(): void {
    if (!this.db) return;

    const schema = `
      CREATE TABLE IF NOT EXISTS session_metadata (
        session_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS npcs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id TEXT NOT NULL,
        type TEXT NOT NULL,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        position_z REAL NOT NULL,
        data TEXT
      );
    `;

    this.db.exec(schema);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Inventory Methods
  public async saveItem(item: { itemId: string; quantity: number; metadata?: Record<string, any> }): Promise<number> {
    if (!this.db || !this.sessionId) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT INTO inventory (item_id, quantity, metadata)
      VALUES (?, ?, ?)
    `);
    
    const metadataStr = item.metadata ? JSON.stringify(item.metadata) : null;
    return stmt.run(item.itemId, item.quantity, metadataStr).lastInsertRowid;
  }

  public async loadItems(): Promise<any[]> {
    if (!this.db || !this.sessionId) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`SELECT * FROM inventory`);
    const rows = stmt.all();
    
    return rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      quantity: row.quantity,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  }

  public async loadItem(itemId: string): Promise<any | null> {
    if (!this.db || !this.sessionId) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`SELECT * FROM inventory WHERE item_id = ?`);
    const row = stmt.get(itemId);

    if (!row) return null;

    return {
      id: row.id,
      itemId: row.item_id,
      quantity: row.quantity,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  public async updateItem(itemId: string, quantity: number, metadata?: Record<string, any>): Promise<void> {
    if (!this.db || !this.sessionId) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE inventory SET quantity = ?, metadata = ?
      WHERE item_id = ?
    `);

    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    stmt.run(quantity, metadataStr, itemId);
  }

  // NPC Methods
  public async saveNPC(npc: { entityId: string; type: string; position: { x: number; y: number; z: number }; data?: Record<string, any> }): Promise<number> {
    if (!this.db || !this.sessionId) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO npcs (entity_id, type, position_x, position_y, position_z, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const dataStr = npc.data ? JSON.stringify(npc.data) : null;
    return stmt.run(
      npc.entityId,
      npc.type,
      npc.position.x,
      npc.position.y,
      npc.position.z,
      dataStr
    ).lastInsertRowid;
  }

  public async loadNPCs(): Promise<any[]> {
    if (!this.db || !this.sessionId) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`SELECT * FROM npcs`);
    const rows = stmt.all();

    return rows.map(row => ({
      id: row.id,
      entityId: row.entity_id,
      type: row.type,
      position: {
        x: row.position_x,
        y: row.position_y,
        z: row.position_z
      },
      data: row.data ? JSON.parse(row.data) : null
    }));
  }

  public async loadNPC(entityId: string): Promise<any | null> {
    if (!this.db || !this.sessionId) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`SELECT * FROM npcs WHERE entity_id = ?`);
    const row = stmt.get(entityId);

    if (!row) return null;

    return {
      id: row.id,
      entityId: row.entity_id,
      type: row.type,
      position: {
        x: row.position_x,
        y: row.position_y,
        z: row.position_z
      },
      data: row.data ? JSON.parse(row.data) : null
    };
  }

  // Metadata Methods
  public async saveMetadata(metadata: SessionMetadata): Promise<void> {
    if (!this.db || !this.sessionId) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO session_metadata (session_id, created_at, updated_at, version)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        version = excluded.version
    `);

    stmt.run(
      metadata.sessionId,
      metadata.createdAt,
      metadata.updatedAt,
      metadata.version
    );
  }

  public async loadMetadata(): Promise<SessionMetadata | null> {
    if (!this.db || !this.sessionId) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`SELECT * FROM session_metadata WHERE session_id = ?`);
    const row = stmt.get(this.sessionId);

    if (!row) return null;

    return {
      sessionId: row.session_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    };
  }

  /**
   * Executes a series of database operations within a single transaction.
   * @param operations A function that receives the database instance and performs operations.
   */
  public runTransaction(operations: (db: Database) => void): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.prepare('BEGIN').run();
    try {
      operations(this.db);
      this.db.prepare('COMMIT').run();
    } catch (error) {
      this.db.prepare('ROLLBACK').run();
      throw error;
    }
  }
}
