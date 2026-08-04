import { ApiServiceError } from './errors';
import type { SessionMetadata, SessionData, CreateSessionRequest } from './contracts/sessions';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

export const getSessions = async (): Promise<{ data: SessionMetadata[]; success: boolean }> => {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorBody(response, 'Failed to fetch sessions');
    throw new ApiServiceError(message, response.status);
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
    const message = await parseErrorBody(response, 'Failed to create session');
    throw new ApiServiceError(message, response.status);
  }

  return response.json();
};
