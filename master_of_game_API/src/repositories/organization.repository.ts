import Database from 'better-sqlite3';
import {
  Organization,
  PlayerOrganizationAffiliation,
  UpdatePlayerAffiliationInput,
  UpdateOrganizationStatusInput,
  GetOrganizationsListFilter,
  AffiliationInteraction,
} from '../types/organization.types';

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

export const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: 'org_city_guard',
    name: 'Міська Варта',
    type: 'military',
    is_secret: false,
    is_known_to_player: true,
    description: 'Офіційні правоохоронці міста, відповідальні за порядок, патрулювання вулиць та захист громадян.',
    hierarchy: [
      {
        rank_id: 'CAPTAIN',
        rank_name: 'Капітан Варти',
        superior_id: null,
        privileges: ['Командування гарнізоном', 'Доступ до archives'],
        duties: ['Забезпечення порядку в місті', 'Звіт перед намісником'],
      },
      {
        rank_id: 'SERGEANT',
        rank_name: 'Сержант',
        superior_id: 'CAPTAIN',
        privileges: ['Керування патрулем', 'Право арешту'],
        duties: ['Патрулювання кварталів', 'Допит підозрюваних'],
      },
      {
        rank_id: 'GUARD',
        rank_name: 'Вартовий',
        superior_id: 'SERGEANT',
        privileges: ['Носіння зброї', 'Доступ до казарми'],
        duties: ['Чергування на брамі', 'Виконання наказів'],
      },
      {
        rank_id: 'RECRUIT',
        rank_name: 'Рекрут',
        superior_id: 'GUARD',
        privileges: ['Базове спорядження'],
        duties: ['Навчання', 'Варта на складах'],
      },
    ],
    objectives: {
      public: ['Захист жителів міста від злочинності', 'Підтримання порядку на вулицях'],
      secret: ['Викриття контрабандних мереж Гільдії Тіней', 'Захист секретного арсеналу від шпигунів'],
    },
    resources: {
      wealth_level: 'medium',
      manpower_level: 'high',
      influence: 'high',
    },
  },
  {
    id: 'org_thieves_guild',
    name: 'Гільдія Тіней',
    type: 'syndicate',
    is_secret: true,
    is_known_to_player: false,
    description: 'Мережа злодіїв та контрабандистів, що контролює тіньовий ринок столиці.',
    hierarchy: [
      {
        rank_id: 'M',
        rank_name: 'Майстер Тіней',
        superior_id: null,
        privileges: ['Керування осередком'],
        duties: ['Забезпечення безпеки осередку', 'Розподіл фінансів'],
      },
      {
        rank_id: 'S1',
        rank_name: 'Тінь',
        superior_id: 'M',
        privileges: ['Скупка краденого', 'Доступ до замовлень'],
        duties: ['Виконання мінімум 1 контракту на місяць', 'Навчання Шукачів'],
      },
      {
        rank_id: 'S2',
        rank_name: 'Шпигун',
        superior_id: 'M',
        privileges: ['Збір інформації', 'Недоторканність'],
        duties: ['Збір інформації про патрулі міської варти'],
      },
      {
        rank_id: 'N',
        rank_name: 'Шукач',
        superior_id: 'S1',
        privileges: ['Доступ до базового притулку'],
        duties: ['Віддавати 10% здобичі гільдії', 'Виконувати дрібні доручення'],
      },
    ],
    objectives: {
      public: ['Взаємодопомога', 'Захист бідних районів'],
      secret: ['Повалення поточного намісника', 'Монополізація ринку забороненої магії'],
    },
    resources: {
      wealth_level: 'high',
      manpower_level: 'medium',
      influence: 'high',
    },
  },
  {
    id: 'org_mages_order',
    name: 'Орден Аркануму',
    type: 'academic',
    is_secret: false,
    is_known_to_player: true,
    description: 'Спільнота магів та вчених, що займається дослідженням давнього чаклунства та магічних аномалій.',
    hierarchy: [
      {
        rank_id: 'ARCHMAGE',
        rank_name: 'Архімаг',
        superior_id: null,
        privileges: ['Доступ до Секретної Бібліотеки', 'Право голосу у Раді'],
        duties: ['Збереження магічної рівноваги', 'Керування Орденом'],
      },
      {
        rank_id: 'MASTER',
        rank_name: 'Майстер Магії',
        superior_id: 'ARCHMAGE',
        privileges: ['Проведення ритуалів', 'Навчання учнів'],
        duties: ['Дослідження аномалій', 'Захист вежі'],
      },
      {
        rank_id: 'ADEPT',
        rank_name: 'Адепт',
        superior_id: 'MASTER',
        privileges: ['Доступ до лабораторій'],
        duties: ['Складання зілля', 'Допомога Майстрам'],
      },
      {
        rank_id: 'APPRENTICE',
        rank_name: 'Учень',
        superior_id: 'ADEPT',
        privileges: ['Доступ до базової бібліотеки'],
        duties: ['Прибирання лабораторій', 'Вивчення заклять'],
      },
    ],
    objectives: {
      public: ['Дослідження магічних аномалій', 'Навчання обдарованих магів'],
      secret: ['Пошук втраченого артефакту Першодавніх', 'Контроль за магічними джерелами міста'],
    },
    resources: {
      wealth_level: 'high',
      manpower_level: 'low',
      influence: 'high',
    },
  },
];

export class OrganizationRepository {
  constructor(private db: Database.Database) {}

  private mapOrganizationRow(row: DBOrganizationRow): Organization {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      is_secret: Boolean(row.is_secret),
      is_known_to_player: Boolean(row.is_known_to_player),
      description: row.description,
      hierarchy: row.hierarchy ? JSON.parse(row.hierarchy) : [],
      objectives: row.objectives ? JSON.parse(row.objectives) : { public: [], secret: [] },
      resources: row.resources
        ? JSON.parse(row.resources)
        : { wealth_level: 'medium', manpower_level: 'medium', influence: 'medium' },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapAffiliationRow(row: DBPlayerAffiliationRow): PlayerOrganizationAffiliation {
    return {
      organization_id: row.organization_id,
      rank_id: row.rank_id,
      reputation: row.reputation,
      interactions: row.interactions ? JSON.parse(row.interactions) : [],
      player_notes: row.player_notes || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public seedDefaultOrganizations(): void {
    const countRow = (this.db.prepare('SELECT count(*) as count FROM organizations').get() as any)?.count;
    if (countRow > 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO organizations (id, name, type, is_secret, is_known_to_player, description, hierarchy, objectives, resources)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const org of DEFAULT_ORGANIZATIONS) {
      stmt.run(
        org.id,
        org.name,
        org.type,
        org.is_secret ? 1 : 0,
        org.is_known_to_player ? 1 : 0,
        org.description,
        JSON.stringify(org.hierarchy),
        JSON.stringify(org.objectives),
        JSON.stringify(org.resources)
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
    const stmt = this.db.prepare(`
      INSERT INTO organizations (id, name, type, is_secret, is_known_to_player, description, hierarchy, objectives, resources)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      org.id,
      org.name,
      org.type,
      org.is_secret ? 1 : 0,
      org.is_known_to_player ? 1 : 0,
      org.description,
      JSON.stringify(org.hierarchy || []),
      JSON.stringify(org.objectives || { public: [], secret: [] }),
      JSON.stringify(org.resources || { wealth_level: 'medium', manpower_level: 'medium', influence: 'medium' })
    );

    return this.findById(org.id)!;
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
