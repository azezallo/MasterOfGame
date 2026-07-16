import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  GetMeRequest,
  GetMeResponse
} from './contracts/auth';
import { ApiServiceError } from './errors';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const headers = {
  'Content-Type': 'application/json',
};

export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ApiServiceError(errorData.message || 'Register failed', response.status);
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
    const errorData = await response.json();
    throw new ApiServiceError(errorData.message || 'Login failed', response.status);
  }

  return response.json();
};

export const getMe = async (data: GetMeRequest, customHeaders?: Record<string, string>): Promise<GetMeResponse> => {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
    body: data.body ? JSON.stringify(data.body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ApiServiceError(errorData.message || 'Get me failed', response.status);
  }

  return response.json();
};
