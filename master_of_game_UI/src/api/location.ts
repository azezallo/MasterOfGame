import { ApiServiceError } from './errors';
import type { LocationData } from '../types/location';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

export const getMapLocations = async (sessionId: string, parentLocationId?: string, signal?: AbortSignal): Promise<{ data: LocationData[]; success: boolean }> => {
  const url = new URL(`${BASE_URL}/sessions/${sessionId}/locations`);
  if (parentLocationId) {
    url.searchParams.append('parent_location_id', parentLocationId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const message = await parseErrorBody(response, 'Failed to fetch map locations');
    throw new ApiServiceError(message, response.status);
  }

  return response.json();
};
