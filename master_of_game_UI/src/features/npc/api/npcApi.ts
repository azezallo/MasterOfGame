import type { NpcData, FetchNpcsParams } from '../types/npc';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const MOCK_NPCS_STORE: NpcData[] = [
  {
    npc_id: 'npc_edgar_barkeep',
    status: 'alive',
    is_recently_active: true,
    last_active_at: Date.now() - 300000,
    public_profile: {
      name: 'Едгар "Вусач"',
      role: 'Корчмар таверни "Старий Кабан"',
      appearance: 'Кремезний чоловік середнього віку з пишними вусами та фартухом у плямах від елю.',
      public_description: 'Відомий своєю гостинністю та знанням усіх чуток у місті.',
    },
    knowledge: {
      hidden_memory: {
        secrets: [
          {
            secret_id: 'sec_edgar_01',
            description: 'Ховає у підвалі таверни контрабандне вино з південних провінцій.',
            source: 'witnessed',
            discovery_status: 'discovered_by_player',
          },
          {
            secret_id: 'sec_edgar_02',
            description: 'Таємно сплачує данину Гільдії Тіней.',
            source: 'heard',
            discovery_status: 'hidden',
          },
        ],
      },
      player_notes: {
        content: 'Едгар знає багато про місцевих купців. Можна розпитати про Гарріка.',
        last_updated: 1700000000,
      },
    },
    relationships: [
      {
        target_npc_id: 'npc_innkeeper_bork',
        target_npc_name: 'Борк',
        relationship_type: 'Business_Partner',
        strength: 0.7,
        summary: 'Давні компаньйони по торговому ремеслу.',
      },
      {
        target_npc_id: 'npc_merchant_garrick',
        target_npc_name: 'Купець Гаррік',
        relationship_type: 'Regular_Customer',
        strength: 0.3,
        summary: 'Гаррік частує клієнтів у його корчмі.',
      },
    ],
    spatial_presence: {
      current_location_id: 'loc_tavern_boar',
    },
  },
  {
    npc_id: 'npc_merchant_garrick',
    status: 'alive',
    is_recently_active: true,
    last_active_at: Date.now() - 600000,
    public_profile: {
      name: 'Купець Гаррік',
      role: 'Торговець хутром та спеціями',
      appearance: 'Худорлявий чоловік у шовковому жупані з багатьма перснями на пальцях.',
      public_description: 'Завжди готовий укласти вигідну угоду, але ретельно перевіряє кожну монету.',
    },
    knowledge: {
      hidden_memory: {
        secrets: [
          {
            secret_id: 'sec_garrick_01',
            description: 'Має боргове зобов\'язання перед місцевим ковалем.',
            source: 'witnessed',
            discovery_status: 'discovered_by_player',
          },
        ],
      },
      player_notes: {
        content: 'Він винен 500 монет за поставку вовчих шкур.',
        last_updated: 1700001000,
      },
    },
    relationships: [
      {
        target_npc_id: 'npc_blacksmith_torin',
        target_npc_name: 'Торін',
        relationship_type: 'Debtor',
        strength: -0.4,
        summary: 'Заборгував за кування реманенту.',
      },
    ],
    spatial_presence: {
      current_location_id: 'loc_market_square',
    },
  },
  {
    npc_id: 'npc_mysterious_ranger',
    status: 'alive',
    is_recently_active: true,
    last_active_at: Date.now() - 1200000,
    public_profile: {
      name: 'Елвін Слідопит',
      role: 'Страж Темного Лісу',
      appearance: 'Високий ельфійський мисливець у зеленому плащі з тисовим луком за спиною.',
      public_description: 'Мовчазний охоронець лісових стежок, що рідко заходить до міста.',
    },
    knowledge: {
      hidden_memory: {
        secrets: [
          {
            secret_id: 'sec_elwin_01',
            description: 'Знає таємне святилище на півночі лісу.',
            source: 'witnessed',
            discovery_status: 'discovered_by_player',
          },
        ],
      },
      player_notes: {
        content: 'Пообіцяв провести крізь запеклі хащі, якщо знайду його втрачений амулет.',
        last_updated: 1700002000,
      },
    },
    relationships: [],
    spatial_presence: {
      current_location_id: 'loc_dark_forest_edge',
    },
  },
  {
    npc_id: 'npc_innkeeper_bork',
    status: 'coma',
    is_recently_active: true,
    last_active_at: Date.now() - 1800000,
    public_profile: {
      name: 'Борк Старий',
      role: 'Власник заїзду',
      appearance: 'Сивий старий з глибоким шрамом на щоці.',
      public_description: 'Колишній найманець, який тримає заїзд на виїзді з міста.',
    },
    knowledge: {
      hidden_memory: {
        secrets: [],
      },
      player_notes: {
        content: 'Тимчасово у комі після нападу розбійників.',
        last_updated: 1700003000,
      },
    },
    relationships: [],
    spatial_presence: {
      current_location_id: 'loc_tavern_boar_room1',
    },
  },
  {
    npc_id: 'npc_blacksmith_torin',
    status: 'alive',
    is_recently_active: true,
    last_active_at: Date.now() - 2400000,
    public_profile: {
      name: 'Торін Коваль',
      role: 'Майстер-зброяр',
      appearance: 'Широкоплечий плечистий чоловік з обпаленими сивими рукавами та шкіряним фартухом.',
      public_description: 'Кує найкращі мечі в окрузі. Цінує чесність та якісний метал.',
    },
    knowledge: {
      hidden_memory: {
        secrets: [
          {
            secret_id: 'sec_torin_01',
            description: 'Шукає рідкісну руду стародавнього міфрилу.',
            source: 'heard',
            discovery_status: 'revealed_to_all',
          },
        ],
      },
      player_notes: {
        content: 'Може покращити шкіряний обладунок за 50 монет.',
        last_updated: 1700004000,
      },
    },
    relationships: [
      {
        target_npc_id: 'npc_merchant_garrick',
        target_npc_name: 'Купець Гаррік',
        relationship_type: 'Creditor',
        strength: -0.4,
        summary: 'Очікує на повернення боргу.',
      },
    ],
    spatial_presence: {
      current_location_id: 'loc_smithy_01',
    },
  },
  {
    npc_id: 'npc_captain_valerius',
    status: 'dead',
    is_recently_active: false,
    public_profile: {
      name: 'Капітан Валерій',
      role: 'Колишній командир варти',
      appearance: 'Поважний воїн у сталевих обладунках із золотим карбуванням.',
      public_description: 'Героїчно загинув під час облоги східних воріт.',
    },
    knowledge: {
      hidden_memory: {
        secrets: [
          {
            secret_id: 'sec_val_01',
            description: 'Залишив захований ключ від міської скарбниці у схованці.',
            source: 'witnessed',
            discovery_status: 'discovered_by_player',
          },
        ],
      },
      player_notes: {
        content: 'Розслідуємо обставини його загибелі.',
        last_updated: 1700005000,
      },
    },
    relationships: [],
  },
  {
    npc_id: 'npc_thief_shadow',
    status: 'captured',
    is_recently_active: false,
    public_profile: {
      name: 'Корвус Тінь',
      role: 'Агент Гільдії Тіней',
      appearance: 'Худий молодик у темній куртці з капюшоном.',
      public_description: 'Ув\'язнений у міській в\'язниці за спробу пограбування ратуші.',
    },
    knowledge: {
      hidden_memory: {
        secrets: [],
      },
      player_notes: {
        content: 'Сидить у темниці. Можна спробувати викупити або допитати.',
        last_updated: 1700006000,
      },
    },
    relationships: [],
  },
  {
    npc_id: 'npc_cultist_malakor',
    status: 'missing',
    is_recently_active: false,
    public_profile: {
      name: 'Малакор Невловимий',
      role: 'Окультист Ордену Очі',
      appearance: 'Невідома постать у чорному балахоні.',
      public_description: 'Безвісти зник після ритуалу в підземеллі.',
    },
    knowledge: {
      hidden_memory: {
        secrets: [],
      },
      player_notes: {
        content: 'Розшукується орденом.',
        last_updated: 1700007000,
      },
    },
    relationships: [],
  },
];

export async function fetchNpcs(
  sessionId: string,
  params?: FetchNpcsParams
): Promise<NpcData[]> {
  const queryParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    queryParams.append('status', params.status);
  }
  if (params?.query) {
    queryParams.append('query', params.query);
  }
  if (params?.locationId) {
    queryParams.append('location_id', params.locationId);
  }
  if (params?.activeOnly) {
    queryParams.append('active_only', 'true');
  }

  const url = `${API_BASE_URL}/sessions/${sessionId}/npcs?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      return getFilteredMockNpcs(params);
    }

    const result = await response.json();
    return result.data || result || getFilteredMockNpcs(params);
  } catch {
    return getFilteredMockNpcs(params);
  }
}

export async function fetchNpcDossier(
  sessionId: string,
  npcId: string
): Promise<NpcData> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/npcs/${npcId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      return getMockNpcById(npcId);
    }

    const result = await response.json();
    return result.data || result || getMockNpcById(npcId);
  } catch {
    return getMockNpcById(npcId);
  }
}

export async function updateNpcPlayerNotes(
  sessionId: string,
  npcId: string,
  notes: string
): Promise<{ success: boolean; notes: string; lastUpdated: number }> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/npcs/${npcId}/notes`;

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: notes }),
      credentials: 'include',
    });

    if (!response.ok) {
      return updateMockNpcNotes(npcId, notes);
    }

    const result = await response.json();
    return {
      success: true,
      notes: result.data?.content ?? notes,
      lastUpdated: result.data?.last_updated ?? Date.now(),
    };
  } catch {
    return updateMockNpcNotes(npcId, notes);
  }
}

function getFilteredMockNpcs(params?: FetchNpcsParams): NpcData[] {
  let list = [...MOCK_NPCS_STORE];

  if (params?.activeOnly) {
    list = list.filter((n) => n.is_recently_active);
  }

  if (params?.status && params.status !== 'all') {
    list = list.filter((n) => n.status === params.status);
  }

  if (params?.query) {
    const q = params.query.toLowerCase().trim();
    list = list.filter(
      (n) =>
        n.public_profile.name.toLowerCase().includes(q) ||
        n.public_profile.role.toLowerCase().includes(q)
    );
  }

  if (params?.locationId) {
    list = list.filter(
      (n) => n.spatial_presence?.current_location_id === params.locationId
    );
  }

  return list;
}

function getMockNpcById(npcId: string): NpcData {
  const found = MOCK_NPCS_STORE.find((n) => n.npc_id === npcId);
  if (found) return found;

  return {
    npc_id: npcId,
    status: 'alive',
    public_profile: {
      name: 'Невідомий NPC',
      role: 'Мешканець світу',
      appearance: 'Звичайний вигляд.',
      public_description: 'Немає додаткового опису.',
    },
    knowledge: {
      player_notes: {
        content: '',
        last_updated: Date.now(),
      },
    },
  };
}

function updateMockNpcNotes(
  npcId: string,
  notes: string
): { success: boolean; notes: string; lastUpdated: number } {
  const npc = MOCK_NPCS_STORE.find((n) => n.npc_id === npcId);
  const now = Date.now();
  if (npc) {
    if (!npc.knowledge) {
      npc.knowledge = {};
    }
    npc.knowledge.player_notes = {
      content: notes,
      last_updated: now,
    };
  }
  return {
    success: true,
    notes,
    lastUpdated: now,
  };
}
