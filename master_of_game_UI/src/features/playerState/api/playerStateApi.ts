import type { PlayerStateProfile } from '../types/playerState';

const API_BASE_URL = 'http://localhost:3000';

export const MOCK_PLAYER_STATE: PlayerStateProfile = {
  physical_states: [
    { name: 'light_wound', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  ],
  body_states: [
    { name: 'fatigue', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  ],
  psychological_states: [
    { name: 'stress', timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
  ],
  attributes: {
    strength: 25,
    agility: 30,
    endurance: 28,
    perception: 22,
    willpower: 20,
  },
  derived_stats: {
    max_carry_weight_kg: 55.0,
  },
  magic_stats: {
    mana_pool: 100,
    current_mana: 25,
    mana_flow: 5,
  },
  skills: [
    { name: 'Магія вогню', value: 50 },
    { name: 'Фехтування мечем', value: 30 },
    { name: 'Приховане пересування', value: 15 },
  ],
};

export async function fetchPlayerState(sessionId: string): Promise<PlayerStateProfile> {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/player-state`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn(`Failed to fetch player state from API (${response.status}), fallback to default mock.`);
      return MOCK_PLAYER_STATE;
    }

    const json = await response.json();
    return json.data || MOCK_PLAYER_STATE;
  } catch (error) {
    console.warn('Error fetching player state from network, using mock:', error);
    return MOCK_PLAYER_STATE;
  }
}
