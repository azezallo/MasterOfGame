import { Database } from 'better-sqlite3';
import type { LocationData } from '../types/location.types';
import { LocationSchema } from '../schemas/location.schema';

export interface DBLocationRow {
  id: string;
  parent_location_id: string | null;
  name: string;
  type: string;
  x: number | null;
  y: number | null;
  z: number | null;
  data: string;
}

export class LocationRepository {
  constructor(private db: Database) {}

  public save(location: LocationData): void {
    const stmt = this.db.prepare(`
      INSERT INTO locations (id, parent_location_id, name, type, x, y, z, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        parent_location_id = excluded.parent_location_id,
        name = excluded.name,
        type = excluded.type,
        x = excluded.x,
        y = excluded.y,
        z = excluded.z,
        data = excluded.data,
        updated_at = (cast(strftime('%s', 'now') as int))
    `);

    const coords = location.matrix_coordinates;
    const dataStr = JSON.stringify(location);

    stmt.run(
      location.location_id,
      location.parent_location_id,
      location.name,
      location.location_type,
      coords?.x ?? null,
      coords?.y ?? null,
      coords?.z ?? null,
      dataStr
    );
  }

  public findById(id: string): LocationData | null {
    const stmt = this.db.prepare(`SELECT * FROM locations WHERE id = ?`);
    const row = stmt.get(id) as DBLocationRow | undefined;
    
    if (!row) return null;
    
    try {
      const parsedData = JSON.parse(row.data);
      return LocationSchema.parse(parsedData);
    } catch (error) {
      console.error(`Failed to parse location data for id ${id}`, error);
      return null;
    }
  }

  public findByParentId(parentId: string | null): LocationData[] {
    const query = parentId === null 
      ? `SELECT * FROM locations WHERE parent_location_id IS NULL`
      : `SELECT * FROM locations WHERE parent_location_id = ?`;
      
    const stmt = this.db.prepare(query);
    const rows = (parentId === null ? stmt.all() : stmt.all(parentId)) as DBLocationRow[];
    
    return rows.map(row => {
      try {
         return LocationSchema.parse(JSON.parse(row.data));
      } catch (error) {
         console.error(`Failed to parse location data for id ${row.id}`, error);
         return null;
      }
    }).filter((loc): loc is LocationData => loc !== null);
  }

  public search(queryStr: string): LocationData[] {
    const stmt = this.db.prepare(`SELECT * FROM locations WHERE name LIKE ?`);
    const rows = stmt.all(`%${queryStr}%`) as DBLocationRow[];
    
    return rows.map(row => {
      try {
         return LocationSchema.parse(JSON.parse(row.data));
      } catch (error) {
         return null;
      }
    }).filter((loc): loc is LocationData => loc !== null);
  }
}
