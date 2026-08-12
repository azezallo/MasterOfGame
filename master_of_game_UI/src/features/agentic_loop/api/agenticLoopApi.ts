import type {
  StreamTurnPayload,
  CompressContextPayload,
  CompressContextResponse,
  SSEEvent,
} from '../types';
import {
  streamTurnPayloadSchema,
  compressContextPayloadSchema,
  compressContextResponseSchema,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function streamTurn(
  payload: StreamTurnPayload,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const validatedPayload = streamTurnPayloadSchema.parse(payload);

  const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    credentials: 'include',
    body: JSON.stringify(validatedPayload),
    signal,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to stream turn (${response.status})`);
  }

  if (!response.body) {
    throw new Error('Response body is empty or ReadableStream not supported');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let currentEvent: string | null = null;
      let currentData: string = '';

      for (const line of lines) {
        const trimmed = line.replace(/\r$/, '').trim();
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith('data:')) {
          currentData += (currentData ? '\n' : '') + trimmed.slice(5).trim();
        } else if (trimmed === '') {
          if (currentEvent && currentData) {
            try {
              const parsedData = JSON.parse(currentData);
              onEvent({ event: currentEvent as any, data: parsedData });
            } catch {
              onEvent({ event: currentEvent as any, data: currentData as any });
            }
          }
          currentEvent = null;
          currentData = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function compressContext(
  payload: CompressContextPayload
): Promise<CompressContextResponse> {
  const validatedPayload = compressContextPayloadSchema.parse(payload);

  const response = await fetch(`${API_BASE_URL}/api/v1/chat/compress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(validatedPayload),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to compress context (${response.status})`);
  }

  const json = await response.json();
  return compressContextResponseSchema.parse(json);
}

export async function fetchHistory(sessionId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/history?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to fetch history (${response.status})`);
  }

  const json = await response.json();
  return json.data?.messages || [];
}

export const agenticLoopApi = {
  streamTurn,
  compressContext,
  fetchHistory,
};
