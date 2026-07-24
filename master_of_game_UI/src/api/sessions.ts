import { ApiServiceError } from './errors';
import type { SessionMetadata, SessionData, CreateSessionRequest } from './contracts/sessions';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const getSessions = async (): Promise<{ data: SessionMetadata[]; success: boolean }> => {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiServiceError('Failed to fetch sessions', response.status);
  }

  return response.json();
};

export const createSession = async (data: CreateSessionRequest): Promise<{ data: SessionData; success: boolean }> => {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiServiceError('Failed to create session', response.status);
  }

  return response.json();
};
