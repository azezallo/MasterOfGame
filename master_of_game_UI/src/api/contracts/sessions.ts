/**
 * Session contracts.
 *
 * GET /sessions returns camelCase fields (SessionMetadata).
 * POST /sessions returns snake_case fields (SessionData).
 *
 * This mirrors the current backend contract (api_contract.json).
 * If the backend is unified in the future, these types should be
 * consolidated into a single normalized format.
 */
export interface SessionMetadata {
  characterName: string;
  createdAt: number;
  gameName: string;
  lastPlayedAt: number;
  sessionId: string;
  version: number;
}

export interface SessionData {
  character_name: string;
  created_at: number;
  game_name: string;
  last_played_at: number;
  session_id: string;
}

export interface CreateSessionRequest {
  characterName: string;
  gameName: string;
}
