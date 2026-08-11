import Database from 'better-sqlite3';
import { WorldStateRepository } from '../repositories/world_state.repository';
import { WorldStateService } from '../services/world_state.service';

describe('WorldStateService Unit Tests', () => {
  let db: Database.Database;
  let repo: WorldStateRepository;
  let service: WorldStateService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
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
    `);

    repo = new WorldStateRepository(db);
    service = new WorldStateService(repo);
  });

  afterEach(() => {
    db.close();
  });

  test('1. Initializes default world state with Ukrainian narrative date', () => {
    const state = service.getWorldState();
    expect(state.time.current_date).toBe('1024-06-15T14:00:00.000Z');
    expect(state.time.narrative_date).toBe('15 Червня 1024 року (Літо)');
    expect(state.time.is_night).toBe(false);
    expect(state.weather.timeline.length).toBeGreaterThan(0);
  });

  test('2. Advances time correctly and updates narrative date & night status', () => {
    const updated = service.advanceTime({ hours: 10 });
    expect(updated.time.narrative_date).toBe('16 Червня 1024 року (Літо)');
    expect(updated.time.is_night).toBe(true);
  });

  test('3. Overrides weather timeline for specified range', () => {
    const updated = service.overrideWeather({
      condition: 'Епічна магічна гроза',
      from_hour: 12,
      to_hour: 16,
    });

    expect(updated.weather.current_condition).toBe('Епічна магічна гроза');
    const overriddenItem = updated.weather.timeline.find(t => t.from_hour === 12 && t.to_hour === 16);
    expect(overriddenItem).toBeDefined();
    expect(overriddenItem?.condition).toBe('Епічна магічна гроза');
  });

  test('4. Filters world events by location ID and tier', () => {
    service.manageEvent({
      action: 'create',
      event_id: 'evt_global',
      title: 'Глобальна війна',
      description: 'Війна між двома королівствами',
      tier: 'GLOBAL',
    });

    service.manageEvent({
      action: 'create',
      event_id: 'evt_local_blackwood',
      title: 'Зникнення лісорубів',
      description: 'У Чорному Лісі зникли лісоруби',
      tier: 'LOCAL',
      location_id: 'loc_blackwood',
    });

    service.manageEvent({
      action: 'create',
      event_id: 'evt_local_other',
      title: 'Крадіжка в порту',
      description: 'Крадіжка в портовому містечку',
      tier: 'LOCAL',
      location_id: 'loc_port',
    });

    const blackwoodState = service.getWorldState('loc_blackwood');
    expect(blackwoodState.events.length).toBe(2);
    expect(blackwoodState.events.map(e => e.id)).toContain('evt_global');
    expect(blackwoodState.events.map(e => e.id)).toContain('evt_local_blackwood');
    expect(blackwoodState.events.map(e => e.id)).not.toContain('evt_local_other');
  });

  test('5. Triggers annual calendar events automatically when advancing time', () => {
    service.manageCalendarEvent({
      action: 'create',
      calendar_event_id: 'cal_midsummer',
      month: 6,
      day: 21,
      title: 'День Купала',
      description: 'Традиційне язичницьке свято літа.',
      tier: 'GLOBAL',
    });

    service.advanceTime({ days: 7 });

    const state = service.getWorldState();
    const triggeredEvent = state.events.find(e => e.id.includes('cal_midsummer'));
    expect(triggeredEvent).toBeDefined();
    expect(triggeredEvent?.title).toBe('День Купала');
    expect(triggeredEvent?.status).toBe('ACTIVE');
  });
});
