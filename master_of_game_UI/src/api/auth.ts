import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  GetMeResponse
} from './contracts/auth';
import { ApiServiceError } from './errors';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const headers = {
  'Content-Type': 'application/json',
};

/**
 * Safely parses error body from a failed response.
 * Falls back to HTTP status text if body is not JSON.
 */
async function parseErrorBody(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (typeof data === 'object' && data !== null && 'message' in data) {
      return String((data as { message: unknown }).message);
    }
  } catch {
    // Response body is not JSON — use fallback
  }
  return `${fallbackMessage} (${response.status} ${response.statusText})`;
}

export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorBody(response, 'Register failed');
    throw new ApiServiceError(message, response.status);
  }

  return response.json();
};

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorBody(response, 'Login failed');
    throw new ApiServiceError(message, response.status);
  }

  return response.json();
};

export const getMe = async (): Promise<GetMeResponse> => {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorBody(response, 'Get me failed');
    throw new ApiServiceError(message, response.status);
  }

  return response.json();
};
