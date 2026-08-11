import Database from 'better-sqlite3';
import { ItemTemplate, ItemInstance } from '../schemas/item.schema';

export interface DBItemTemplateRow {
  template_id: string;
  category: string;
  public_profile: string;
  physical_properties: string;
  special_mechanics: string | null;
  created_at: number;
}

export interface DBItemRow {
  item_id: string;
  template_id: string | null;
  category: string;
  public_profile: string;
  private_profile: string | null;
  physical_properties: string;
  special_mechanics: string | null;
  location_context: string;
  created_at: number;
  updated_at: number;
}

function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('[ItemRepository] JSON parse failure:', err, 'Raw value:', jsonString);
    return fallback;
  }
}

const DEFAULT_PUBLIC_PROFILE = { name: '', appearance: '', public_description: '' };
const DEFAULT_PHYSICAL_PROPERTIES = { weight_kg: 0, durability: { current: 100, max: 100, state: 'intact' as const }, base_value_gold: 0 };
const DEFAULT_LOCATION_CONTEXT = { current_owner_type: 'location' as const, current_owner_id: '' };

export class ItemRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // --- Templates ---
  public saveTemplate(template: ItemTemplate): void {
    const stmt = this.db.prepare(`
      INSERT INTO item_templates (template_id, category, public_profile, physical_properties, special_mechanics)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(template_id) DO UPDATE SET
        category = excluded.category,
        public_profile = excluded.public_profile,
        physical_properties = excluded.physical_properties,
        special_mechanics = excluded.special_mechanics
    `);

    stmt.run(
      template.template_id,
      template.category,
      JSON.stringify(template.public_profile),
      JSON.stringify(template.physical_properties),
      template.special_mechanics ? JSON.stringify(template.special_mechanics) : null
    );
  }

  public getTemplate(templateId: string): ItemTemplate | null {
    const stmt = this.db.prepare(`SELECT * FROM item_templates WHERE template_id = ?`);
    const row = stmt.get(templateId) as DBItemTemplateRow | undefined;
    if (!row) return null;

    return {
      template_id: row.template_id,
      category: row.category as any,
      public_profile: safeJsonParse(row.public_profile, DEFAULT_PUBLIC_PROFILE),
      physical_properties: safeJsonParse(row.physical_properties, DEFAULT_PHYSICAL_PROPERTIES),
      special_mechanics: safeJsonParse(row.special_mechanics, null),
    };
  }

  public getAllTemplates(): ItemTemplate[] {
    const stmt = this.db.prepare(`SELECT * FROM item_templates`);
    const rows = stmt.all() as DBItemTemplateRow[];
    return rows.map(row => ({
      template_id: row.template_id,
      category: row.category as any,
      public_profile: safeJsonParse(row.public_profile, DEFAULT_PUBLIC_PROFILE),
      physical_properties: safeJsonParse(row.physical_properties, DEFAULT_PHYSICAL_PROPERTIES),
      special_mechanics: safeJsonParse(row.special_mechanics, null),
    }));
  }

  // --- Item Instances ---
  public saveItem(item: ItemInstance): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO items (
        item_id, template_id, category, public_profile, private_profile,
        physical_properties, special_mechanics, location_context, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET
        template_id = excluded.template_id,
        category = excluded.category,
        public_profile = excluded.public_profile,
        private_profile = excluded.private_profile,
        physical_properties = excluded.physical_properties,
        special_mechanics = excluded.special_mechanics,
        location_context = excluded.location_context,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      item.item_id,
      item.template_id || null,
      item.category,
      JSON.stringify(item.public_profile),
      item.private_profile ? JSON.stringify(item.private_profile) : null,
      JSON.stringify(item.physical_properties),
      item.special_mechanics ? JSON.stringify(item.special_mechanics) : null,
      JSON.stringify(item.location_context),
      item.created_at || now,
      now
    );
  }

  public getItem(itemId: string): ItemInstance | null {
    const stmt = this.db.prepare(`SELECT * FROM items WHERE item_id = ?`);
    const row = stmt.get(itemId) as DBItemRow | undefined;
    if (!row) return null;

    return {
      item_id: row.item_id,
      template_id: row.template_id,
      category: row.category as any,
      public_profile: safeJsonParse(row.public_profile, DEFAULT_PUBLIC_PROFILE),
      private_profile: safeJsonParse(row.private_profile, null),
      physical_properties: safeJsonParse(row.physical_properties, DEFAULT_PHYSICAL_PROPERTIES),
      special_mechanics: safeJsonParse(row.special_mechanics, null),
      location_context: safeJsonParse(row.location_context, DEFAULT_LOCATION_CONTEXT),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public getItems(itemIds: string[]): ItemInstance[] {
    if (itemIds.length === 0) return [];
    const placeholders = itemIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`SELECT * FROM items WHERE item_id IN (${placeholders})`);
    const rows = stmt.all(...itemIds) as DBItemRow[];

    return rows.map(row => ({
      item_id: row.item_id,
      template_id: row.template_id,
      category: row.category as any,
      public_profile: safeJsonParse(row.public_profile, DEFAULT_PUBLIC_PROFILE),
      private_profile: safeJsonParse(row.private_profile, null),
      physical_properties: safeJsonParse(row.physical_properties, DEFAULT_PHYSICAL_PROPERTIES),
      special_mechanics: safeJsonParse(row.special_mechanics, null),
      location_context: safeJsonParse(row.location_context, DEFAULT_LOCATION_CONTEXT),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  public searchItems(filters: { query?: string | undefined; ownerType?: string | undefined; ownerId?: string | undefined; category?: string | undefined }): ItemInstance[] {
    let sql = `SELECT * FROM items WHERE 1=1`;
    const params: any[] = [];

    if (filters.category) {
      sql += ` AND category = ?`;
      params.push(filters.category);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as DBItemRow[];

    let results = rows.map(row => ({
      item_id: row.item_id,
      template_id: row.template_id,
      category: row.category as any,
      public_profile: safeJsonParse(row.public_profile, DEFAULT_PUBLIC_PROFILE),
      private_profile: safeJsonParse(row.private_profile, null),
      physical_properties: safeJsonParse(row.physical_properties, DEFAULT_PHYSICAL_PROPERTIES),
      special_mechanics: safeJsonParse(row.special_mechanics, null),
      location_context: safeJsonParse(row.location_context, DEFAULT_LOCATION_CONTEXT),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    if (filters.ownerType) {
      results = results.filter(item => item.location_context.current_owner_type === filters.ownerType);
    }
    if (filters.ownerId) {
      results = results.filter(item => item.location_context.current_owner_id === filters.ownerId);
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(item =>
        item.public_profile.name.toLowerCase().includes(q) ||
        item.public_profile.appearance.toLowerCase().includes(q) ||
        item.public_profile.public_description.toLowerCase().includes(q) ||
        item.item_id.toLowerCase().includes(q)
      );
    }

    return results;
  }

  public deleteItem(itemId: string): void {
    const stmt = this.db.prepare(`DELETE FROM items WHERE item_id = ?`);
    stmt.run(itemId);
  }
}
