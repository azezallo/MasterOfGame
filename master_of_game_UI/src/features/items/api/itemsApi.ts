import type { Item } from '../types/item';

const API_BASE_URL = 'http://localhost:3000';

export async function fetchItems(
  sessionId: string,
  params?: { owner_type?: string; owner_id?: string; category?: string; query?: string }
): Promise<Item[]> {
  const queryParams = new URLSearchParams();
  if (params?.owner_type) queryParams.append('owner_type', params.owner_type);
  if (params?.owner_id) queryParams.append('owner_id', params.owner_id);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.query) queryParams.append('query', params.query);

  const url = `${API_BASE_URL}/sessions/${sessionId}/items?${queryParams.toString()}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch items: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || [];
}

export async function fetchItemById(sessionId: string, itemId: string): Promise<Item> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/items/${itemId}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch item '${itemId}': ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}
