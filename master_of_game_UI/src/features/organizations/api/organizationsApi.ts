import type { OrganizationSummary, OrganizationDossier } from '../types/organization';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const MOCK_ORGANIZATIONS: OrganizationDossier[] = [
  {
    id: 'org_city_guard',
    name: 'Міська Варта',
    type: 'military',
    is_secret: false,
    description: 'Офіційні правоохоронці міста, відповідальні за порядок, патрулювання вулиць та захист громадян.',
    player_rank: null,
    player_reputation: 15,
    public_objectives: [
      'Захист жителів міста від злочинності',
      'Підтримання порядку на вулицях',
    ],
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
    ],
    mermaid_graph: 'graph TD\n  CAPTAIN["Капітан Варти"] --> SERGEANT["Сержант"]\n  SERGEANT --> GUARD["Вартовий"]',
    interactions: [
      {
        timestamp: '2026-08-01T10:00:00Z',
        description: 'Допоміг зупинити бійку в портовому шинку.',
        reputation_change: 15,
      },
    ],
    player_notes: 'Міська варта ставиться лояльно, але капітан підозрює нас у зв\'язках із контрабандистами.',
  },
  {
    id: 'org_thieves_guild',
    name: 'Гільдія Тіней',
    type: 'syndicate',
    is_secret: true,
    description: 'Таємна мережа злодіїв, скупників краденого та контрабандистів, що контролює тіньовий ринок.',
    player_rank: 'S2',
    player_reputation: 40,
    public_objectives: [
      'Взаємодопомога та захист бідних районів від здирництва варти',
    ],
    hierarchy: [
      {
        rank_id: 'M',
        rank_name: 'Майстер Тіней',
        superior_id: null,
        privileges: ['Керування осередком', 'Доступ до казначейства'],
        duties: ['Забезпечення безпеки гільдії'],
      },
      {
        rank_id: 'S1',
        rank_name: 'Тінь',
        superior_id: 'M',
        privileges: ['Скупка краденого по вигідному курсу'],
        duties: ['Виконання особливих контрактів'],
      },
      {
        rank_id: 'S2',
        rank_name: 'Шпигун',
        superior_id: 'M',
        privileges: ['Збір інформації', 'Доступ до притулку'],
        duties: ['Збір відомостей про патрулі варти'],
      },
      {
        rank_id: 'N',
        rank_name: 'Шукач',
        superior_id: 'S1',
        privileges: ['Базовий притулок'],
        duties: ['Віддавати 10% здобичі'],
      },
    ],
    mermaid_graph: 'graph TD\n  M["Майстер Тіней"] --> S1["Тінь"]\n  M --> S2["Шпигун"]\n  S1 --> N["Шукач"]',
    interactions: [
      {
        timestamp: '2026-07-28T14:30:00Z',
        description: 'Приніс вкрадений амулет і викрив зрадника.',
        reputation_change: 25,
      },
      {
        timestamp: '2026-07-25T11:00:00Z',
        description: 'Успішно передав шифровану записку агенту в шинку.',
        reputation_change: 15,
      },
    ],
    player_notes: 'Мій ранг - Шпигун. Маю доступ до притулку під заїздом.',
  },
  {
    id: 'org_mages_order',
    name: 'Орден Аркануму',
    type: 'academic',
    is_secret: false,
    description: 'Спільнота магів та вчених, що займається дослідженням давнього чаклунства та магічних аномалій.',
    player_rank: null,
    player_reputation: -15,
    public_objectives: [
      'Дослідження магічних аномалій',
      'Навчання обдарованих магів',
    ],
    hierarchy: [
      {
        rank_id: 'ARCHMAGE',
        rank_name: 'Архімаг',
        superior_id: null,
        privileges: ['Доступ до Секретної Бібліотеки'],
        duties: ['Збереження магічної рівноваги'],
      },
      {
        rank_id: 'MASTER',
        rank_name: 'Майстер Магії',
        superior_id: 'ARCHMAGE',
        privileges: ['Проведення ритуалів'],
        duties: ['Дослідження аномалій'],
      },
    ],
    mermaid_graph: 'graph TD\n  ARCHMAGE["Архімаг"] --> MASTER["Майстер Магії"]',
    interactions: [
      {
        timestamp: '2026-08-05T09:15:00Z',
        description: 'Відмовився віддати знайдений некромантський фоліант адепту ордену.',
        reputation_change: -15,
      },
    ],
    player_notes: 'Насторожено ставляться до нас після інциденту з вежею.',
  },
];

export async function fetchOrganizations(sessionId: string): Promise<OrganizationSummary[]> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/organizations`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) {
      return MOCK_ORGANIZATIONS.map(toSummary);
    }
    const result = await response.json();
    return (result.data || result || MOCK_ORGANIZATIONS.map(toSummary)).map((o: any) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      is_secret: Boolean(o.is_secret),
      description: o.description || '',
      player_rank: o.affiliation?.rank_id || o.player_rank || null,
      player_reputation: o.affiliation?.reputation ?? o.player_reputation ?? 0,
    }));
  } catch {
    return MOCK_ORGANIZATIONS.map(toSummary);
  }
}

export async function fetchOrganizationDetails(
  sessionId: string,
  organizationId: string
): Promise<OrganizationDossier> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/organizations/${organizationId}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) {
      return getMockOrganizationById(organizationId);
    }
    const result = await response.json();
    const data = result.data || result;
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      is_secret: Boolean(data.is_secret),
      description: data.description || '',
      player_rank: data.affiliation?.rank_id || data.player_rank || null,
      player_reputation: data.affiliation?.reputation ?? data.player_reputation ?? 0,
      public_objectives: data.objectives?.public || data.public_objectives || [],
      hierarchy: data.hierarchy || [],
      mermaid_graph: data.mermaid_graph || '',
      interactions: data.affiliation?.interactions || data.interactions || [],
      player_notes: data.player_notes || data.affiliation?.player_notes || '',
    };
  } catch {
    return getMockOrganizationById(organizationId);
  }
}

export async function updateOrganizationNotes(
  sessionId: string,
  organizationId: string,
  notes: string
): Promise<{ success: boolean; notes: string; lastUpdated: number }> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/organizations/${organizationId}/notes`;
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: notes }),
      credentials: 'include',
    });
    if (!response.ok) {
      return updateMockNotes(organizationId, notes);
    }
    const result = await response.json();
    return {
      success: true,
      notes: result.data?.player_notes ?? result.data?.content ?? notes,
      lastUpdated: result.data?.last_updated ?? Date.now(),
    };
  } catch {
    return updateMockNotes(organizationId, notes);
  }
}

function toSummary(org: OrganizationDossier): OrganizationSummary {
  return {
    id: org.id,
    name: org.name,
    type: org.type,
    is_secret: org.is_secret,
    description: org.description,
    player_rank: org.player_rank,
    player_reputation: org.player_reputation,
  };
}

function getMockOrganizationById(id: string): OrganizationDossier {
  const found = MOCK_ORGANIZATIONS.find((o) => o.id === id);
  if (found) return found;
  return {
    id,
    name: 'Невідома фракція',
    type: 'unknown',
    is_secret: false,
    description: 'Деталі про цю організацію відсутні.',
    player_rank: null,
    player_reputation: 0,
    public_objectives: [],
    hierarchy: [],
    mermaid_graph: '',
    interactions: [],
    player_notes: '',
  };
}

function updateMockNotes(id: string, notes: string) {
  const found = MOCK_ORGANIZATIONS.find((o) => o.id === id);
  if (found) {
    found.player_notes = notes;
  }
  return {
    success: true,
    notes,
    lastUpdated: Date.now(),
  };
}
