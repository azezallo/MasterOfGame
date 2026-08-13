import Database from 'better-sqlite3';
import { NpcData, NpcRelationship } from '../types/npc.types';
import { NpcSchema } from '../schemas/npc.schema';

export interface DBNpcRow {
  npc_id: string;
  status: string;
  name: string;
  role: string | null;
  current_location_id: string | null;
  data: string;
  created_at: number;
  updated_at: number;
}

function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('[NpcRepository] JSON parse failure:', err, 'Raw value:', jsonString);
    return fallback;
  }
}

export class NpcRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  private parseRowToNpc(row: DBNpcRow): NpcData | null {
    const rawObj = safeJsonParse<any>(row.data, null);
    if (!rawObj) return null;

    const now = Math.floor(Date.now() / 1000);
    const normalized = {
      npc_id: row.npc_id || rawObj.npc_id || `npc_${Date.now()}`,
      status: row.status || rawObj.status || 'alive',
      created_at: row.created_at || rawObj.created_at || now,
      updated_at: row.updated_at || rawObj.updated_at || now,
      public_profile: {
        name: row.name || rawObj.public_profile?.name || rawObj.name || 'Невідомий NPC',
        role: row.role || rawObj.public_profile?.role || rawObj.role || 'Мешканець',
        appearance: rawObj.public_profile?.appearance || rawObj.appearance || 'Звичайний вигляд',
        public_description: rawObj.public_profile?.public_description || rawObj.public_description || 'Опис відсутній',
      },
      private_profile: rawObj.private_profile || {
        traits: { moral_alignment: '', resilience: '', social_style: '' },
        drivers: { primary_goals: [], critical_fears: [] },
        attachments: { family_loyalty: '', organization_loyalty: '', core_values: '' },
        current_status: { mood: 'calm', relationship_to_player: 'neutral', current_goal: '' },
      },
      knowledge: rawObj.knowledge || {
        world_perception: { description: '', dynamic_updates: [] },
        hidden_memory: { events: [], memory_summary: '', secrets: [] },
        subjective_thoughts: { player_evaluation: '', topics_discussed: [], mood_impact: '' },
        player_notes: { content: '', last_updated: 0 },
      },
      relationships: rawObj.relationships || [],
      organizations: rawObj.organizations || [],
      spatial_presence: rawObj.spatial_presence || {
        current_location_id: row.current_location_id || rawObj.location_id || '',
        default_routine: [],
        override_event: null,
      },
    };

    try {
      return NpcSchema.parse(normalized);
    } catch (err) {
      console.error(`[NpcRepository] Schema parse fallback for npc_id="${row.npc_id}":`, err);
      return normalized as NpcData;
    }
  }

  public save(npc: NpcData): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO npcs (
        npc_id, status, name, role, current_location_id, data, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(npc_id) DO UPDATE SET
        status = excluded.status,
        name = excluded.name,
        role = excluded.role,
        current_location_id = excluded.current_location_id,
        data = excluded.data,
        updated_at = excluded.updated_at
    `);

    const dataStr = JSON.stringify(npc);

    stmt.run(
      npc.npc_id,
      npc.status,
      npc.public_profile.name,
      npc.public_profile.role || null,
      npc.spatial_presence?.current_location_id || null,
      dataStr,
      npc.created_at || now,
      now
    );

    if (npc.relationships && Array.isArray(npc.relationships)) {
      for (const rel of npc.relationships) {
        this.saveRelationship(npc.npc_id, rel);
      }
    }
  }

  public findById(npcId: string): NpcData | null {
    const stmt = this.db.prepare(`SELECT * FROM npcs WHERE npc_id = ?`);
    const row = stmt.get(npcId) as DBNpcRow | undefined;
    if (!row) return null;
    return this.parseRowToNpc(row);
  }

  public findAll(filter?: { status?: string | undefined; location_id?: string | undefined; role?: string | undefined }): NpcData[] {
    let sql = `SELECT * FROM npcs WHERE 1=1`;
    const params: any[] = [];

    if (filter?.status && filter.status !== 'all') {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }

    if (filter?.location_id) {
      sql += ` AND current_location_id = ?`;
      params.push(filter.location_id);
    }

    if (filter?.role) {
      sql += ` AND role LIKE ?`;
      params.push(`%${filter.role}%`);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as DBNpcRow[];

    return rows
      .map(row => this.parseRowToNpc(row))
      .filter((npc): npc is NpcData => npc !== null);
  }

  public search(
    queryStr?: string,
    filter?: { status?: string | undefined; location_id?: string | undefined; role?: string | undefined; relationship_type?: string | undefined }
  ): NpcData[] {
    let allNpcs = this.findAll(filter ? { status: filter.status, location_id: filter.location_id, role: filter.role } : undefined);

    if (filter?.relationship_type) {
      const relType = filter.relationship_type.toLowerCase();
      allNpcs = allNpcs.filter(npc =>
        npc.relationships.some(r => r.relationship_type.toLowerCase().includes(relType))
      );
    }

    if (queryStr && queryStr.trim().length > 0) {
      const q = queryStr.toLowerCase().trim();
      allNpcs = allNpcs.filter(npc =>
        npc.npc_id.toLowerCase().includes(q) ||
        npc.public_profile.name.toLowerCase().includes(q) ||
        npc.public_profile.role.toLowerCase().includes(q) ||
        npc.public_profile.appearance.toLowerCase().includes(q) ||
        npc.public_profile.public_description.toLowerCase().includes(q)
      );
    }

    return allNpcs;
  }

  public saveRelationship(sourceId: string, rel: NpcRelationship): void {
    const stmt = this.db.prepare(`
      INSERT INTO npc_relationships (
        source_npc_id, target_npc_id, relationship_type, strength, summary, last_updated
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_npc_id, target_npc_id) DO UPDATE SET
        relationship_type = excluded.relationship_type,
        strength = excluded.strength,
        summary = excluded.summary,
        last_updated = excluded.last_updated
    `);

    stmt.run(
      sourceId,
      rel.target_npc_id,
      rel.relationship_type,
      rel.strength,
      rel.summary || '',
      rel.last_updated || Math.floor(Date.now() / 1000)
    );
  }

  public delete(npcId: string): void {
    this.db.prepare(`DELETE FROM npc_relationships WHERE source_npc_id = ? OR target_npc_id = ?`).run(npcId, npcId);
    const stmt = this.db.prepare(`DELETE FROM npcs WHERE npc_id = ?`);
    stmt.run(npcId);
  }
}
