export interface Player {
  id: number;
  login: string;
  password_hash: string;
  salt?: string;
}

export interface Session {
  session_id: string;
  login: string;
  expires_at: number;
}

export interface PasswordHash {
  hash: string;
  salt: string;
}

export interface LoginResponse {
  session_id: string;
  expires_at: number;
  player: {
    id: number;
    login: string;
  };
}

export interface SessionResponse {
  session: Session;
  player: {
    id: number;
    login: string;
  };
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
}
