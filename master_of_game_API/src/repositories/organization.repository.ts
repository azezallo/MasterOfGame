import Database from 'better-sqlite3';
import {
  Organization,
  PlayerOrganizationAffiliation,
  UpdatePlayerAffiliationInput,
  UpdateOrganizationStatusInput,
  GetOrganizationsListFilter,
  AffiliationInteraction,
} from '../types/organization.types';
import { OrganizationSchema } from '../schemas/organization.schema';
import { getInitialOrganizationsPreset } from '../config';

interface DBOrganizationRow {
  id: string;
  name: string;
  type: string;
  is_secret: number;
  is_known_to_player: number;
  description: string;
  hierarchy: string;
  objectives: string;
  resources: string;
  created_at: number;
  updated_at: number;
}

interface DBPlayerAffiliationRow {
  organization_id: string;
  rank_id: string | null;
  reputation: number;
  interactions: string;
  player_notes: string | null;
  created_at: number;
  updated_at: number;
}

function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('[OrganizationRepository] JSON parse failure:', err, 'Raw value:', jsonString);
    return fallback;
  }
}

export class OrganizationRepository {
  constructor(private db: Database.Database) {}

  private mapOrganizationRow(row: DBOrganizationRow): Organization {
    const rawHierarchy = safeJsonParse(row.hierarchy, []);
    const rawObjectives = safeJsonParse(row.objectives, { public: [], secret: [] });
    const rawResources = safeJsonParse(row.resources, {
      wealth_level: 'medium',
      manpower_level: 'medium',
      influence: 'medium',
    });

    const parsedOrg = OrganizationSchema.safeParse({
      id: row.id,
      name: row.name,
      type: row.type,
      is_secret: Boolean(row.is_secret),
      is_known_to_player: Boolean(row.is_known_to_player),
      description: row.description || '',
      hierarchy: Array.isArray(rawHierarchy) ? rawHierarchy : [],
      objectives: typeof rawObjectives === 'object' && rawObjectives !== null ? rawObjectives : { public: [], secret: [] },
      resources: typeof rawResources === 'object' && rawResources !== null ? rawResources : { wealth_level: 'medium', manpower_level: 'medium', influence: 'medium' },
      created_at: row.created_at,
      updated_at: row.updated_at,
    });

    if (parsedOrg.success) {
      return parsedOrg.data as Organization;
    }

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      is_secret: Boolean(row.is_secret),
      is_known_to_player: Boolean(row.is_known_to_player),
      description: row.description || '',
      hierarchy: Array.isArray(rawHierarchy) ? rawHierarchy : [],
      objectives: typeof rawObjectives === 'object' && rawObjectives !== null ? rawObjectives : { public: [], secret: [] },
      resources: typeof rawResources === 'object' && rawResources !== null ? rawResources : { wealth_level: 'medium', manpower_level: 'medium', influence: 'medium' },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapAffiliationRow(row: DBPlayerAffiliationRow): PlayerOrganizationAffiliation {
    return {
      organization_id: row.organization_id,
      rank_id: row.rank_id,
      reputation: row.reputation,
      interactions: safeJsonParse(row.interactions, []),
      player_notes: row.player_notes || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public seedDefaultOrganizations(): void {
    const countRow = (this.db.prepare('SELECT count(*) as count FROM organizations').get() as any)?.count;
    if (countRow > 0) return;

    const presetOrganizations = getInitialOrganizationsPreset();
    const stmt = this.db.prepare(`
      INSERT INTO organizations (id, name, type, is_secret, is_known_to_player, description, hierarchy, objectives, resources)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const rawOrg of presetOrganizations) {
      const validatedOrg = OrganizationSchema.parse({
        id: rawOrg.id || `org_${Date.now()}`,
        name: rawOrg.name || 'Організація',
        type: rawOrg.type || 'faction',
        is_secret: Boolean(rawOrg.is_secret),
        is_known_to_player: Boolean(rawOrg.is_known_to_player),
        description: rawOrg.description || '',
        hierarchy: Array.isArray(rawOrg.hierarchy) ? rawOrg.hierarchy : [],
        objectives: typeof rawOrg.objectives === 'object' && rawOrg.objectives !== null ? rawOrg.objectives : { public: [], secret: [] },
        resources: typeof rawOrg.resources === 'object' && rawOrg.resources !== null ? rawOrg.resources : { wealth_level: 'medium', manpower_level: 'medium', influence: 'medium' },
      });

      stmt.run(
        validatedOrg.id,
        validatedOrg.name,
        validatedOrg.type,
        validatedOrg.is_secret ? 1 : 0,
        validatedOrg.is_known_to_player ? 1 : 0,
        validatedOrg.description,
        JSON.stringify(validatedOrg.hierarchy),
        JSON.stringify(validatedOrg.objectives),
        JSON.stringify(validatedOrg.resources)
      );
    }
  }

  public findAll(): Organization[] {
    const rows = this.db.prepare('SELECT * FROM organizations').all() as DBOrganizationRow[];
    return rows.map(r => this.mapOrganizationRow(r));
  }

  public findById(id: string): Organization | null {
    const row = this.db.prepare('SELECT * FROM organizations WHERE id = ?').get(id) as DBOrganizationRow | undefined;
    if (!row) return null;
    return this.mapOrganizationRow(row);
  }

  public findByFilter(filter?: GetOrganizationsListFilter): Organization[] {
    let sql = 'SELECT * FROM organizations WHERE 1=1';
    const params: any[] = [];

    if (filter?.type) {
      sql += ' AND type = ?';
      params.push(filter.type);
    }

    if (filter?.is_secret !== undefined) {
      sql += ' AND is_secret = ?';
      params.push(filter.is_secret ? 1 : 0);
    }

    const rows = this.db.prepare(sql).all(...params) as DBOrganizationRow[];
    return rows.map(r => this.mapOrganizationRow(r));
  }

  public findKnownToPlayer(): Organization[] {
    const rows = this.db.prepare('SELECT * FROM organizations WHERE is_known_to_player = 1').all() as DBOrganizationRow[];
    return rows.map(r => this.mapOrganizationRow(r));
  }

  public create(org: Organization): Organization {
    const validatedOrg = OrganizationSchema.parse(org);

    const stmt = this.db.prepare(`
      INSERT INTO organizations (id, name, type, is_secret, is_known_to_player, description, hierarchy, objectives, resources)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      validatedOrg.id,
      validatedOrg.name,
      validatedOrg.type,
      validatedOrg.is_secret ? 1 : 0,
      validatedOrg.is_known_to_player ? 1 : 0,
      validatedOrg.description,
      JSON.stringify(validatedOrg.hierarchy),
      JSON.stringify(validatedOrg.objectives),
      JSON.stringify(validatedOrg.resources)
    );

    return this.findById(validatedOrg.id)!;
  }

  public updateStatus(id: string, updates: UpdateOrganizationStatusInput): Organization | null {
    const current = this.findById(id);
    if (!current) return null;

    const newIsKnown = updates.is_known_to_player !== undefined ? updates.is_known_to_player : current.is_known_to_player;

    const newObjectives = {
      public: updates.objectives_override?.public !== undefined ? updates.objectives_override.public : current.objectives.public,
      secret: updates.objectives_override?.secret !== undefined ? updates.objectives_override.secret : current.objectives.secret,
    };

    const newResources = {
      ...current.resources,
      ...(updates.resources_change || {}),
    };

    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      UPDATE organizations
      SET is_known_to_player = ?, objectives = ?, resources = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      newIsKnown ? 1 : 0,
      JSON.stringify(newObjectives),
      JSON.stringify(newResources),
      now,
      id
    );

    return this.findById(id);
  }

  public getPlayerAffiliation(organizationId: string): PlayerOrganizationAffiliation | null {
    const row = this.db.prepare('SELECT * FROM player_organization_affiliations WHERE organization_id = ?').get(organizationId) as DBPlayerAffiliationRow | undefined;
    if (!row) return null;
    return this.mapAffiliationRow(row);
  }

  public getAllPlayerAffiliations(): PlayerOrganizationAffiliation[] {
    const rows = this.db.prepare('SELECT * FROM player_organization_affiliations').all() as DBPlayerAffiliationRow[];
    return rows.map(r => this.mapAffiliationRow(r));
  }

  public updatePlayerAffiliation(organizationId: string, input: UpdatePlayerAffiliationInput): PlayerOrganizationAffiliation {
    const existing = this.getPlayerAffiliation(organizationId) || {
      organization_id: organizationId,
      rank_id: null,
      reputation: 0,
      interactions: [],
      player_notes: '',
    };

    const newRankId = input.rank_id !== undefined ? input.rank_id : existing.rank_id;
    let newReputation = existing.reputation;
    if (input.reputation_delta !== undefined) {
      newReputation = Math.max(-100, Math.min(100, existing.reputation + input.reputation_delta));
    }

    const interactions = [...existing.interactions];
    if (input.interaction_event) {
      const newEvent: AffiliationInteraction = {
        timestamp: new Date().toISOString(),
        description: input.interaction_event.description,
        reputation_change: input.interaction_event.reputation_change,
      };
      interactions.push(newEvent);
    }

    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO player_organization_affiliations (organization_id, rank_id, reputation, interactions, player_notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id) DO UPDATE SET
        rank_id = excluded.rank_id,
        reputation = excluded.reputation,
        interactions = excluded.interactions,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      organizationId,
      newRankId,
      newReputation,
      JSON.stringify(interactions),
      existing.player_notes || '',
      now
    );

    return this.getPlayerAffiliation(organizationId)!;
  }

  public updatePlayerNotes(organizationId: string, notes: string): PlayerOrganizationAffiliation {
    const existing = this.getPlayerAffiliation(organizationId) || {
      organization_id: organizationId,
      rank_id: null,
      reputation: 0,
      interactions: [],
      player_notes: '',
    };

    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO player_organization_affiliations (organization_id, rank_id, reputation, interactions, player_notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id) DO UPDATE SET
        player_notes = excluded.player_notes,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      organizationId,
      existing.rank_id,
      existing.reputation,
      JSON.stringify(existing.interactions),
      notes,
      now
    );

    return this.getPlayerAffiliation(organizationId)!;
  }
}
