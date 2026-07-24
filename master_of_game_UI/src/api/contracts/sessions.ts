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
