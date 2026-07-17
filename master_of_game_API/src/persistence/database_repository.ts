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
        game_name TEXT NOT NULL,
        character_name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_played_at INTEGER NOT NULL,
        version INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS player_state (
        session_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        level INTEGER NOT NULL,
        experience REAL NOT NULL,
        health REAL NOT NULL,
        mana REAL NOT NULL,
        attributes TEXT
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
  public saveItem(item: { itemId: string; quantity: number; metadata?: Record<string, any> }, db?: Database): number {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');
    
    const stmt = targetDb.prepare(`
      INSERT INTO inventory (item_id, quantity, metadata)
      VALUES (?, ?, ?)
    `);
    
    const metadataStr = item.metadata ? JSON.stringify(item.metadata) : null;
    return stmt.run(item.itemId, item.quantity, metadataStr).lastInsertRowid;
  }

  public loadItems(db?: Database): any[] {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');
    
    const stmt = targetDb.prepare(`SELECT * FROM inventory`);
    const rows = stmt.all();
    
    return rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      quantity: row.quantity,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  }

  public loadItem(itemId: string, db?: Database): any | null {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`SELECT * FROM inventory WHERE item_id = ?`);
    const row = stmt.get(itemId);

    if (!row) return null;

    return {
      id: row.id,
      itemId: row.item_id,
      quantity: row.quantity,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  public updateItem(itemId: string, quantity: number, metadata?: Record<string, any>, db?: Database): void {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`
      UPDATE inventory SET quantity = ?, metadata = ?
      WHERE item_id = ?
    `);

    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    stmt.run(quantity, metadataStr, itemId);
  }

  // NPC Methods
  public saveNPC(npc: { entityId: string; type: string; position: { x: number; y: number; z: number }; data?: Record<string, any> }, db?: Database): number {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`
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

  public loadNPCs(db?: Database): any[] {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`SELECT * FROM npcs`);
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

  public loadNPC(entityId: string, db?: Database): any | null {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`SELECT * FROM npcs WHERE entity_id = ?`);
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
  public saveMetadata(metadata: SessionMetadata, db?: Database): void {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`
      INSERT INTO session_metadata (session_id, game_name, character_name, created_at, last_played_at, version)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        game_name = excluded.game_name,
        character_name = excluded.character_name,
        last_played_at = excluded.last_played_at,
        version = excluded.version
    `);

    stmt.run(
      metadata.sessionId,
      metadata.gameName,
      metadata.characterName,
      metadata.createdAt,
      metadata.lastPlayedAt,
      metadata.version
    );
  }

  public loadMetadata(db?: Database): SessionMetadata | null {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`SELECT * FROM session_metadata WHERE session_id = ?`);
    const row = stmt.get(this.sessionId);

    if (!row) return null;

    return {
      sessionId: row.session_id,
      gameName: row.game_name,
      characterName: row.character_name,
      createdAt: row.created_at,
      lastPlayedAt: row.last_played_at,
      version: row.version,
    };
  }

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

  public savePlayerState(state: { name: string; level: number; experience: number; health: number; mana: number; attributes: Record<string, number> }, db?: Database): void {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`
      INSERT INTO player_state (session_id, name, level, experience, health, mana, attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        name = excluded.name,
        level = excluded.level,
        experience = excluded.experience,
        health = excluded.health,
        mana = excluded.mana,
        attributes = excluded.attributes
    `);

    const attributesStr = state.attributes ? JSON.stringify(state.attributes) : null;
    stmt.run(
      this.sessionId,
      state.name,
      state.level,
      state.experience,
      state.health,
      state.mana,
      attributesStr
    );
  }

  public loadPlayerState(db?: Database): any | null {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`SELECT * FROM player_state WHERE session_id = ?`);
    const row = stmt.get(this.sessionId);

    if (!row) return null;

    return {
      playerId: this.playerId,
      name: row.name,
      level: row.level,
      experience: row.experience,
      health: row.health,
      mana: row.mana,
      attributes: row.attributes ? JSON.parse(row.attributes) : {},
      inventory: [],
    };
  }
}
