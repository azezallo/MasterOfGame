export interface Player {
  id: number;
  login: string;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  player: Player;
}

export interface RegisterRequest {
  login: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export interface GetMeRequest {
  body: Record<string, any>;
}

export interface GetMeResponse {
  success: boolean;
  message: string;
  player: Player;
}
