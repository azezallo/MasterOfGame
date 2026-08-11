import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { OrganizationRepository } from '../repositories/organization.repository';
import { NpcRepository } from '../repositories/npc.repository';
import { OrganizationService } from '../services/organization.service';

describe('Organization Service & Agent Tools Tests', () => {
  let db: Database.Database;
  let orgRepo: OrganizationRepository;
  let npcRepo: NpcRepository;
  let orgService: OrganizationService;
  const testDbPath = path.resolve(__dirname, 'test_organizations.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);

    db.exec(`
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
    `);

    orgRepo = new OrganizationRepository(db);
    orgRepo.seedDefaultOrganizations();

    npcRepo = new NpcRepository(db);
    orgService = new OrganizationService(orgRepo, npcRepo);
  });

  afterEach(() => {
    if (db) db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('should seed default organizations correctly', () => {
    const list = orgService.getOrganizationsList();
    expect(list.length).toBe(3);
    const cityGuard = list.find(o => o.id === 'org_city_guard');
    expect(cityGuard).toBeDefined();
    expect(cityGuard?.name).toBe('Міська Варта');
  });

  it('should generate Mermaid graph correctly for hierarchy', () => {
    const details = orgService.getOrganizationDetails('org_thieves_guild');
    expect(details.mermaid_graph).toContain('graph TD');
    expect(details.mermaid_graph).toContain('M["Майстер Тіней"]');
    expect(details.mermaid_graph).toContain('M --> S1');
    expect(details.mermaid_graph).toContain('S1 --> N');
  });

  it('should retrieve objectives including secret objectives for Agent Tool', () => {
    const res = orgService.getOrganizationObjectives('org_thieves_guild');
    expect(res.objectives.public.length).toBeGreaterThan(0);
    expect(res.objectives.secret.length).toBeGreaterThan(0);
    expect(res.objectives.secret).toContain('Повалення поточного намісника');
  });

  it('should find members of organization from NPC repository', () => {
    npcRepo.save({
      npc_id: 'npc_thief_01',
      status: 'alive',
      public_profile: { name: 'Синдикатний Крадій', role: 'Шпигун', appearance: '', public_description: '' },
      organizations: [{ organization_id: 'org_thieves_guild', rank_id: 'S2', reputation: 50, interactions: [] }],
      spatial_presence: { current_location_id: 'loc_shadow_tavern', default_routine: [], override_event: null },
    } as any);

    const members = orgService.getOrganizationMembers('org_thieves_guild');
    expect(members.length).toBe(1);
    expect(members[0].npc_id).toBe('npc_thief_01');
    expect(members[0].rank_id).toBe('S2');
    expect(members[0].current_location_id).toBe('loc_shadow_tavern');
  });

  it('should update player affiliation and reputation correctly with clamping', () => {
    const updated = orgService.updatePlayerOrganizationAffiliation('org_thieves_guild', {
      rank_id: 'N',
      reputation_delta: 25,
      interaction_event: { description: 'Вступ у гільдію', reputation_change: 25 },
    });

    expect(updated.rank_id).toBe('N');
    expect(updated.reputation).toBe(25);
    expect(updated.interactions.length).toBe(1);
    expect(updated.interactions[0].description).toBe('Вступ у гільдію');

    const maxClamped = orgService.updatePlayerOrganizationAffiliation('org_thieves_guild', {
      reputation_delta: 200,
    });
    expect(maxClamped.reputation).toBe(100);
  });

  it('should update organization status (reveal secret org, change objectives, change resources)', () => {
    const updated = orgService.updateOrganizationStatus('org_thieves_guild', {
      is_known_to_player: true,
      resources_change: { wealth_level: 'low' },
    });

    expect(updated.is_known_to_player).toBe(true);
    expect(updated.resources.wealth_level).toBe('low');

    const knownList = orgService.getPlayerKnownOrganizations();
    expect(knownList.some(o => o.id === 'org_thieves_guild')).toBe(true);
  });

  it('should create new organization on the fly', () => {
    const created = orgService.createOrganization({
      name: 'Культ Чорного Сонця',
      type: 'cult',
      is_secret: true,
      description: 'Таємна секта ритуалістів.',
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Культ Чорного Сонця');

    const details = orgService.getOrganizationDetails(created.id);
    expect(details.type).toBe('cult');
  });

  it('should isolate data for player UI (remove secret objectives)', () => {
    const knownOrgs = orgService.getPlayerKnownOrganizations();
    expect(knownOrgs.every(o => o.is_known_to_player === true)).toBe(true);

    for (const org of knownOrgs) {
      expect((org.objectives as any).secret).toBeUndefined();
      expect(Array.isArray(org.objectives.public)).toBe(true);
    }
  });
});
