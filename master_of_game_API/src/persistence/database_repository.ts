import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config';
import { SessionMetadata } from '../models/session';
import { LocationRepository } from '../repositories/location.repository';
import { ItemRepository } from '../repositories/item.repository';
import { PropertyRepository } from '../repositories/property.repository';
import { NpcRepository } from '../repositories/npc.repository';
import { WorldStateRepository } from '../repositories/world_state.repository';
import { PlayerStateRepository } from '../repositories/player_state.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { SemanticMemoryRepository } from '../repositories/semantic_memory.repository';
import { AgenticLoopRepository } from '../repositories/agentic_loop.repository';

interface DBInventoryRow {
  id: number;
  item_id: string;
  quantity: number;
  metadata: string | null;
}

interface DBNPCRow {
  id: number;
  entity_id: string;
  type: string;
  position_x: number;
  position_y: number;
  position_z: number;
  data: string | null;
}

interface DBSessionMetadataRow {
  session_id: string;
  game_name: string;
  character_name: string;
  created_at: number;
  last_played_at: number;
  version: number;
}

interface DBPlayerStateRow {
  session_id: string;
  name: string;
  level: number;
  experience: number;
  health: number;
  mana: number;
  attributes: string | null;
}

export class DatabaseRepository {
  private db: Database.Database | null = null;
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
        data TEXT NOT NULL,
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS npcs (
        npc_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'alive',
        name TEXT NOT NULL,
        role TEXT,
        current_location_id TEXT,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS npc_relationships (
        source_npc_id TEXT NOT NULL,
        target_npc_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        strength REAL DEFAULT 0,
        summary TEXT,
        last_updated INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        PRIMARY KEY (source_npc_id, target_npc_id)
      );

      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        parent_location_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        x INTEGER,
        y INTEGER,
        z INTEGER,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        FOREIGN KEY (parent_location_id) REFERENCES locations(id)
      );

      CREATE TABLE IF NOT EXISTS item_templates (
        template_id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        public_profile TEXT NOT NULL,
        physical_properties TEXT NOT NULL,
        special_mechanics TEXT,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS items (
        item_id TEXT PRIMARY KEY,
        template_id TEXT,
        category TEXT NOT NULL,
        public_profile TEXT NOT NULL,
        private_profile TEXT,
        physical_properties TEXT NOT NULL,
        special_mechanics TEXT,
        location_context TEXT NOT NULL,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        FOREIGN KEY (template_id) REFERENCES item_templates(template_id)
      );

      CREATE TABLE IF NOT EXISTS properties (
        property_profile_id TEXT PRIMARY KEY,
        owner_type TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        equipped TEXT NOT NULL,
        pocket_inventory TEXT NOT NULL,
        finances TEXT NOT NULL,
        real_estate TEXT NOT NULL,
        storage_caches TEXT NOT NULL,
        vehicles_and_mounts TEXT NOT NULL,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        UNIQUE(owner_type, owner_id)
      );

      CREATE TABLE IF NOT EXISTS world_time_weather (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_date TEXT NOT NULL,
        weather_timeline TEXT NOT NULL,
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS world_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        tier TEXT NOT NULL,
        location_id TEXT,
        start_date TEXT NOT NULL,
        status TEXT NOT NULL,
        resolution_summary TEXT,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        month INTEGER NOT NULL,
        day INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        tier TEXT DEFAULT 'GLOBAL',
        location_id TEXT,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        is_secret INTEGER NOT NULL DEFAULT 0,
        is_known_to_player INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL,
        hierarchy TEXT NOT NULL,
        objectives TEXT NOT NULL,
        resources TEXT NOT NULL,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS player_organization_affiliations (
        organization_id TEXT PRIMARY KEY,
        rank_id TEXT,
        reputation INTEGER NOT NULL DEFAULT 0,
        interactions TEXT NOT NULL DEFAULT '[]',
        player_notes TEXT DEFAULT '',
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      );
    `;

    this.db.exec(schema);
    this.seedDefaultTemplates();
  }

  private seedDefaultTemplates(): void {
    if (!this.db) return;
    const count = (this.db.prepare(`SELECT count(*) as cnt FROM item_templates`).get() as any)?.cnt;
    if (count > 0) return;

    const templates = [
      {
        template_id: 'tpl_iron_sword',
        category: 'weapon',
        public_profile: JSON.stringify({ name: 'Залізний меч', appearance: 'Класичний меч з прямим сталевим лезом.', public_description: 'Надійне військове лезо з простим ефесом.' }),
        physical_properties: JSON.stringify({ weight_kg: 2.5, durability: { current: 100, max: 100, state: 'intact' }, base_value_gold: 25 }),
        special_mechanics: null
      },
      {
        template_id: 'tpl_leather_boots',
        category: 'armor',
        public_profile: JSON.stringify({ name: 'Шкіряні чоботи', appearance: 'Міцні чоботи з темної дубленої шкіри.', public_description: 'Зручне взуття для довгих переходів.' }),
        physical_properties: JSON.stringify({ weight_kg: 1.2, durability: { current: 100, max: 100, state: 'intact' }, base_value_gold: 10 }),
        special_mechanics: null
      },
      {
        template_id: 'tpl_healing_potion',
        category: 'consumable',
        public_profile: JSON.stringify({ name: 'Зілля зцілення', appearance: 'Невелика скляна флаконка з мерехтливою червоною рідиною.', public_description: 'Солодкувате зілля, що прискорює регенерацію тканин.' }),
        physical_properties: JSON.stringify({ weight_kg: 0.3, durability: { current: 1, max: 1, state: 'intact' }, base_value_gold: 15 }),
        special_mechanics: null
      },
      {
        template_id: 'tpl_signet_ring',
        category: 'key',
        public_profile: JSON.stringify({ name: 'Перстень з печаткою', appearance: 'Срібний перстень із зображенням вовчої голови.', public_description: 'Старий масивний перстень.' }),
        physical_properties: JSON.stringify({ weight_kg: 0.05, durability: { current: 100, max: 100, state: 'intact' }, base_value_gold: 15 }),
        special_mechanics: JSON.stringify({ key_properties: { unlocks_key_id: 'item_thief_signet' } })
      },
      {
        template_id: 'tpl_wooden_chest',
        category: 'container',
        public_profile: JSON.stringify({ name: 'Дерев’яна скриня', appearance: 'Окована залізом дубова скриня з масивним замком.', public_description: 'Надійний контейнер для зберігання цінностей.' }),
        physical_properties: JSON.stringify({ weight_kg: 15.0, durability: { current: 100, max: 100, state: 'intact' }, base_value_gold: 50 }),
        special_mechanics: JSON.stringify({ container_properties: { contained_item_ids: [], capacity_weight_kg: 50.0, lock_details: { is_locked: true, key_id: 'item_thief_signet', lockpick_dc: 15 }, trap_details: { has_trap: true, is_disarmed: false, trap_description: 'Отруєна голка', trap_dc: 15, discovery_status: 'hidden' } } })
      },
      {
        template_id: 'tpl_old_letter',
        category: 'document',
        public_profile: JSON.stringify({ name: 'Старий лист', appearance: 'Пожовклий пергамент з печаткою.', public_description: 'Лист з важливим посланням.' }),
        physical_properties: JSON.stringify({ weight_kg: 0.01, durability: { current: 10, max: 10, state: 'intact' }, base_value_gold: 2 }),
        special_mechanics: JSON.stringify({ document_properties: { text_content: 'Зустрінемось опівночі біля старих доків. Принесіть перстень.', language: 'Загальна мова', is_encrypted: false, decryption_dc: 0 } })
      }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO item_templates (template_id, category, public_profile, physical_properties, special_mechanics)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const t of templates) {
      stmt.run(t.template_id, t.category, t.public_profile, t.physical_properties, t.special_mechanics);
    }
  }

  public getLocationRepository(): LocationRepository {
    if (!this.db) throw new Error('Database not initialized');
    return new LocationRepository(this.db);
  }

  public getItemRepository(): ItemRepository {
    if (!this.db) throw new Error('Database not initialized');
    return new ItemRepository(this.db);
  }

  public getPropertyRepository(): PropertyRepository {
    if (!this.db) throw new Error('Database not initialized');
    return new PropertyRepository(this.db);
  }

  public getNpcRepository(): NpcRepository {
    if (!this.db) throw new Error('Database not initialized');
    return new NpcRepository(this.db);
  }

  public getWorldStateRepository(): WorldStateRepository {
    if (!this.db) throw new Error('Database not initialized');
    return new WorldStateRepository(this.db);
  }

  public getPlayerStateRepository(): PlayerStateRepository {
    if (!this.db) throw new Error('Database not initialized');
    return new PlayerStateRepository(this.db);
  }

  public getSemanticMemoryRepository(): SemanticMemoryRepository {
    if (!this.db) throw new Error('Database not initialized');
    return new SemanticMemoryRepository(this.db);
  }

  public getAgenticLoopRepository(): AgenticLoopRepository {
    if (!this.db) throw new Error('Database not initialized');
    return new AgenticLoopRepository(this.db);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Inventory Methods
  public saveItem(item: { itemId: string; quantity: number; metadata?: Record<string, any> | undefined }, db?: Database.Database): number | bigint {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');
    
    const stmt = targetDb.prepare(`
      INSERT INTO inventory (item_id, quantity, metadata)
      VALUES (?, ?, ?)
    `);
    
    const metadataStr = item.metadata ? JSON.stringify(item.metadata) : null;
    return stmt.run(item.itemId, item.quantity, metadataStr).lastInsertRowid;
  }

  public loadItems(db?: Database.Database): any[] {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');
    
    const stmt = targetDb.prepare(`SELECT * FROM inventory`);
    const rows = stmt.all() as DBInventoryRow[];
    
    return rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      quantity: row.quantity,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  }

  public loadItem(itemId: string, db?: Database.Database): any | null {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`SELECT * FROM inventory WHERE item_id = ?`);
    const row = stmt.get(itemId) as DBInventoryRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      itemId: row.item_id,
      quantity: row.quantity,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  public updateItem(itemId: string, quantity: number, metadata?: Record<string, any>, db?: Database.Database): void {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`
      UPDATE inventory SET quantity = ?, metadata = ?
      WHERE item_id = ?
    `);

    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    stmt.run(quantity, metadataStr, itemId);
  }

  // Legacy NPC Methods (Compatibility wrapper for NpcRepository)
  public saveNPC(npc: { entityId: string; type: string; position: { x: number; y: number; z: number }; data?: Record<string, any> | undefined }, _db?: Database.Database): number | bigint {
    const npcRepo = this.getNpcRepository();
    npcRepo.save({
      npc_id: npc.entityId,
      status: 'alive',
      public_profile: {
        name: npc.data?.name || npc.entityId,
        role: npc.type || '',
        appearance: '',
        public_description: '',
      },
      private_profile: {
        traits: { moral_alignment: '', resilience: '', social_style: '' },
        drivers: { primary_goals: [], critical_fears: [] },
        attachments: { family_loyalty: '', organization_loyalty: '', core_values: '' },
        current_status: { mood: 'calm', relationship_to_player: 'neutral', current_goal: '' },
      },
      knowledge: {
        world_perception: { description: '', dynamic_updates: [] },
        hidden_memory: { events: [], memory_summary: '', secrets: [] },
        subjective_thoughts: { player_evaluation: '', topics_discussed: [], mood_impact: '' },
        player_notes: { content: '', last_updated: 0 },
      },
      relationships: [],
      organizations: [],
      spatial_presence: {
        current_location_id: '',
        default_routine: [],
        override_event: null,
      },
    });
    return 1;
  }

  public loadNPCs(_db?: Database.Database): any[] {
    const npcRepo = this.getNpcRepository();
    return npcRepo.findAll().map(n => ({
      id: n.npc_id,
      entityId: n.npc_id,
      type: n.public_profile.role,
      position: { x: 0, y: 0, z: 0 },
      data: n,
    }));
  }

  public loadNPC(entityId: string, _db?: Database.Database): any | null {
    const npcRepo = this.getNpcRepository();
    const n = npcRepo.findById(entityId);
    if (!n) return null;
    return {
      id: n.npc_id,
      entityId: n.npc_id,
      type: n.public_profile.role,
      position: { x: 0, y: 0, z: 0 },
      data: n,
    };
  }

  // Metadata Methods
  public saveMetadata(metadata: SessionMetadata, db?: Database.Database): void {
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

  public loadMetadata(db?: Database.Database): SessionMetadata | null {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');

    const stmt = targetDb.prepare(`SELECT * FROM session_metadata WHERE session_id = ?`);
    const row = stmt.get(this.sessionId) as DBSessionMetadataRow | undefined;

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

  public runTransaction(operations: (db: Database.Database) => void): void {
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

  public savePlayerState(state: any, db?: Database.Database): void {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');
    const repo = new PlayerStateRepository(targetDb);

    if (state.physical_states && state.attributes) {
      repo.savePlayerState(this.sessionId, state);
    } else {
      const existing = repo.getPlayerState(this.sessionId);
      const merged = {
        ...existing,
        name: state.name || (existing as any).name || 'Hero',
        attributes: state.attributes ? { ...existing.attributes, ...state.attributes } : existing.attributes,
      };
      repo.savePlayerState(this.sessionId, merged as any);
    }
  }

  public loadPlayerState(db?: Database.Database): any | null {
    const targetDb = db || this.db;
    if (!targetDb || !this.sessionId) throw new Error('Database not initialized');
    const repo = new PlayerStateRepository(targetDb);
    const profile = repo.getPlayerState(this.sessionId);

    return {
      playerId: this.playerId,
      name: (profile as any).name || 'Hero',
      level: (profile as any).level || 1,
      experience: (profile as any).experience || 0,
      health: (profile as any).health || 100,
      mana: profile.magic_stats?.current_mana ?? 25,
      attributes: profile.attributes,
      physical_states: profile.physical_states,
      body_states: profile.body_states,
      psychological_states: profile.psychological_states,
      derived_stats: profile.derived_stats,
      magic_stats: profile.magic_stats,
      skills: profile.skills,
      inventory: [],
    };
  }

  public getOrganizationRepository(): OrganizationRepository {
    if (!this.db) throw new Error('Database not initialized');
    const orgRepo = new OrganizationRepository(this.db);
    orgRepo.seedDefaultOrganizations();
    return orgRepo;
  }
}
