import Database from 'better-sqlite3';
import { WorldEvent, CalendarEvent, WeatherTimelineItem } from '../types/world_state.types';

export interface DBWorldTimeWeatherRow {
  id: number;
  current_date: string;
  weather_timeline: string;
  updated_at: number;
}

export interface DBWorldEventRow {
  id: string;
  title: string;
  description: string;
  tier: string;
  location_id: string | null;
  start_date: string;
  status: string;
  resolution_summary: string | null;
  created_at: number;
  updated_at: number;
}

export interface DBCalendarEventRow {
  id: string;
  month: number;
  day: number;
  title: string;
  description: string;
  tier: string | null;
  location_id: string | null;
  created_at: number;
}

function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

export class WorldStateRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public getTimeAndWeather(): { current_date: string; weather_timeline: WeatherTimelineItem[] } | null {
    const stmt = this.db.prepare(`SELECT * FROM world_time_weather WHERE id = 1`);
    const row = stmt.get() as DBWorldTimeWeatherRow | undefined;
    if (!row) return null;

    return {
      current_date: row.current_date,
      weather_timeline: safeJsonParse<WeatherTimelineItem[]>(row.weather_timeline, []),
    };
  }

  public saveTimeAndWeather(currentDate: string, weatherTimeline: WeatherTimelineItem[]): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO world_time_weather (id, current_date, weather_timeline, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        current_date = excluded.current_date,
        weather_timeline = excluded.weather_timeline,
        updated_at = excluded.updated_at
    `);
    stmt.run(currentDate, JSON.stringify(weatherTimeline), now);
  }

  public saveWorldEvent(event: WorldEvent): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO world_events (
        id, title, description, tier, location_id, start_date, status, resolution_summary, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        tier = excluded.tier,
        location_id = excluded.location_id,
        start_date = excluded.start_date,
        status = excluded.status,
        resolution_summary = excluded.resolution_summary,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      event.id,
      event.title,
      event.description,
      event.tier,
      event.location_id || null,
      event.start_date,
      event.status,
      event.resolution_summary || null,
      now,
      now
    );
  }

  public getWorldEvent(id: string): WorldEvent | null {
    const stmt = this.db.prepare(`SELECT * FROM world_events WHERE id = ?`);
    const row = stmt.get(id) as DBWorldEventRow | undefined;
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      tier: row.tier as any,
      location_id: row.location_id,
      start_date: row.start_date,
      status: row.status as any,
      resolution_summary: row.resolution_summary,
    };
  }

  public getAllWorldEvents(): WorldEvent[] {
    const stmt = this.db.prepare(`SELECT * FROM world_events ORDER BY created_at DESC`);
    const rows = stmt.all() as DBWorldEventRow[];

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      tier: row.tier as any,
      location_id: row.location_id,
      start_date: row.start_date,
      status: row.status as any,
      resolution_summary: row.resolution_summary,
    }));
  }

  public deleteWorldEvent(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM world_events WHERE id = ?`);
    stmt.run(id);
  }

  public saveCalendarEvent(event: CalendarEvent): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO calendar_events (id, month, day, title, description, tier, location_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        month = excluded.month,
        day = excluded.day,
        title = excluded.title,
        description = excluded.description,
        tier = excluded.tier,
        location_id = excluded.location_id
    `);

    stmt.run(
      event.id,
      event.month,
      event.day,
      event.title,
      event.description,
      event.tier || 'GLOBAL',
      event.location_id || null,
      now
    );
  }

  public getCalendarEvent(id: string): CalendarEvent | null {
    const stmt = this.db.prepare(`SELECT * FROM calendar_events WHERE id = ?`);
    const row = stmt.get(id) as DBCalendarEventRow | undefined;
    if (!row) return null;

    return {
      id: row.id,
      month: row.month,
      day: row.day,
      title: row.title,
      description: row.description,
      tier: (row.tier as any) || 'GLOBAL',
      location_id: row.location_id,
    };
  }

  public getAllCalendarEvents(): CalendarEvent[] {
    const stmt = this.db.prepare(`SELECT * FROM calendar_events ORDER BY month ASC, day ASC`);
    const rows = stmt.all() as DBCalendarEventRow[];

    return rows.map(row => ({
      id: row.id,
      month: row.month,
      day: row.day,
      title: row.title,
      description: row.description,
      tier: (row.tier as any) || 'GLOBAL',
      location_id: row.location_id,
    }));
  }

  public deleteCalendarEvent(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM calendar_events WHERE id = ?`);
    stmt.run(id);
  }
}
