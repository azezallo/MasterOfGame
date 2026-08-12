import type {
  AISettingsResponse,
  SaveAISettingsRequest,
  TestConnectionRequest,
  TestConnectionResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function getAISettings(): Promise<AISettingsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai/settings`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch AI settings (${response.status})`);
  }

  return response.json();
}

export async function saveAISettings(data: SaveAISettingsRequest): Promise<AISettingsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to save AI settings (${response.status})`);
  }

  return response.json();
}

export async function testAIConnection(data: TestConnectionRequest): Promise<TestConnectionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai/test-connection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      message: json.error?.message || json.message || `Помилка з'єднання (${response.status})`,
      error: json.error || {
        code: 'CONNECTION_FAILED',
        providerId: data.providerId,
        message: json.message || `HTTP ${response.status}`,
      },
    };
  }

  return json;
}

export async function fetchModelsFromEndpoint(customEndpoint: string, apiKey?: string | null): Promise<string[]> {
  const result = await testAIConnection({
    providerId: 'openai_compatible',
    customEndpoint,
    apiKey,
  });

  if (result.success && Array.isArray(result.availableModels)) {
    return result.availableModels;
  }

  if (result.error?.message) {
    throw new Error(result.error.message);
  }

  throw new Error(result.message || 'Не вдалося отримати список моделей');
}
