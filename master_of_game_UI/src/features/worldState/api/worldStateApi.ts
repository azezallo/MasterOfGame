import type { WorldState } from '../types/worldState';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const MOCK_WORLD_STATE: WorldState = {
  time: {
    current_date: '1024-06-15T14:00:00Z',
    narrative_date: '15 Червня 1024 року (Літо)',
    is_night: false,
  },
  weather: {
    current_condition: 'Ясно, тепло',
    timeline: [
      { from_hour: 10, to_hour: 12, condition: 'Ранкова злива' },
      { from_hour: 12, to_hour: 16, condition: 'Ясно, тепло' },
      { from_hour: 16, to_hour: 20, condition: 'Збираються хмари, мжичка' },
    ],
  },
  events: [
    {
      id: 'evt_101',
      title: 'Війна Півночі',
      description: 'Північна Імперія розпочала наступ на прикордонні форти Півдня.',
      tier: 'GLOBAL',
      start_date: '1024-06-01',
      status: 'ACTIVE',
    },
  ],
};

export async function fetchWorldState(sessionId: string): Promise<WorldState> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/world-state`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      return MOCK_WORLD_STATE;
    }

    const result = await response.json();
    return result.data || result || MOCK_WORLD_STATE;
  } catch {
    return MOCK_WORLD_STATE;
  }
}
