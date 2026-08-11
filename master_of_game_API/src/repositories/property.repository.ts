import Database from 'better-sqlite3';
import { PropertyProfile } from '../schemas/property.schema';

export interface DBPropertyRow {
  property_profile_id: string;
  owner_type: string;
  owner_id: string;
  equipped: string;
  pocket_inventory: string;
  finances: string;
  real_estate: string;
  storage_caches: string;
  vehicles_and_mounts: string;
  created_at: number;
  updated_at: number;
}

function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('[PropertyRepository] JSON parse failure:', err, 'Raw value:', jsonString);
    return fallback;
  }
}

export class PropertyRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public savePropertyProfile(profile: PropertyProfile): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO properties (
        property_profile_id, owner_type, owner_id,
        equipped, pocket_inventory, finances, real_estate,
        storage_caches, vehicles_and_mounts, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(property_profile_id) DO UPDATE SET
        owner_type = excluded.owner_type,
        owner_id = excluded.owner_id,
        equipped = excluded.equipped,
        pocket_inventory = excluded.pocket_inventory,
        finances = excluded.finances,
        real_estate = excluded.real_estate,
        storage_caches = excluded.storage_caches,
        vehicles_and_mounts = excluded.vehicles_and_mounts,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      profile.property_profile_id,
      profile.owner_context.owner_type,
      profile.owner_context.owner_id,
      JSON.stringify(profile.equipped || []),
      JSON.stringify(profile.pocket_inventory),
      JSON.stringify(profile.finances),
      JSON.stringify(profile.real_estate || []),
      JSON.stringify(profile.storage_caches || []),
      JSON.stringify(profile.vehicles_and_mounts || []),
      profile.created_at || now,
      now
    );
  }

  public getPropertyProfile(ownerType: string, ownerId: string): PropertyProfile | null {
    const stmt = this.db.prepare(`SELECT * FROM properties WHERE owner_type = ? AND owner_id = ?`);
    const row = stmt.get(ownerType, ownerId) as DBPropertyRow | undefined;
    if (!row) return null;

    return {
      property_profile_id: row.property_profile_id,
      owner_context: {
        owner_type: row.owner_type as any,
        owner_id: row.owner_id,
      },
      equipped: safeJsonParse(row.equipped, []),
      pocket_inventory: safeJsonParse(row.pocket_inventory, {
        backpack: { is_equipped: true, backpack_item_id: null, items: [] },
        pockets_and_belt: { items: [] },
        weight_stats: {
          equipped_and_pockets_weight_kg: 0,
          backpack_weight_kg: 0,
          total_weight_kg: 0,
          max_carry_weight_kg: 30.0,
          encumbrance_status: 'normal',
          combat_encumbrance_status: 'normal',
        },
      }),
      finances: safeJsonParse(row.finances, { coins: 0, bank_accounts: [], promissory_notes: [] }),
      real_estate: safeJsonParse(row.real_estate, []),
      storage_caches: safeJsonParse(row.storage_caches, []),
      vehicles_and_mounts: safeJsonParse(row.vehicles_and_mounts, []),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public getPropertyProfileById(profileId: string): PropertyProfile | null {
    const stmt = this.db.prepare(`SELECT * FROM properties WHERE property_profile_id = ?`);
    const row = stmt.get(profileId) as DBPropertyRow | undefined;
    if (!row) return null;

    return {
      property_profile_id: row.property_profile_id,
      owner_context: {
        owner_type: row.owner_type as any,
        owner_id: row.owner_id,
      },
      equipped: safeJsonParse(row.equipped, []),
      pocket_inventory: safeJsonParse(row.pocket_inventory, {
        backpack: { is_equipped: true, backpack_item_id: null, items: [] },
        pockets_and_belt: { items: [] },
        weight_stats: {
          equipped_and_pockets_weight_kg: 0,
          backpack_weight_kg: 0,
          total_weight_kg: 0,
          max_carry_weight_kg: 30.0,
          encumbrance_status: 'normal',
          combat_encumbrance_status: 'normal',
        },
      }),
      finances: safeJsonParse(row.finances, { coins: 0, bank_accounts: [], promissory_notes: [] }),
      real_estate: safeJsonParse(row.real_estate, []),
      storage_caches: safeJsonParse(row.storage_caches, []),
      vehicles_and_mounts: safeJsonParse(row.vehicles_and_mounts, []),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public deletePropertyProfile(profileId: string): void {
    const stmt = this.db.prepare(`DELETE FROM properties WHERE property_profile_id = ?`);
    stmt.run(profileId);
  }
}
