import { ILLMProvider } from './llm_provider.interface';
import {
  LLMProviderId,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  ValidationResult,
  ProviderErrorEvent,
} from '../../types/ai.types';

export class OpenAICompatibleProvider implements ILLMProvider {
  public readonly providerId: LLMProviderId = 'openai_compatible';
  private customEndpoint: string;
  private apiKey?: string;

  constructor(customEndpoint?: string, apiKey?: string) {
    this.customEndpoint = customEndpoint || 'http://localhost:1234/v1';
    this.apiKey = apiKey;
  }

  private buildUrl(path: string, customBaseUrl?: string): string {
    let base = (customBaseUrl || this.customEndpoint).trim().replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (base.endsWith('/v1') && cleanPath.startsWith('/v1/')) {
      base = base.slice(0, -3);
    }
    return `${base}${cleanPath}`;
  }

  private getHeaders(overrideApiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const key = overrideApiKey ?? this.apiKey;
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }
    return headers;
  }

  private createTimeoutController(timeoutMs?: number): { controller: AbortController; timeoutId?: NodeJS.Timeout } {
    const controller = new AbortController();
    if (timeoutMs && timeoutMs > 0) {
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      return { controller, timeoutId };
    }
    return { controller };
  }

  public async generate(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const url = this.buildUrl('/chat/completions');
    const { controller, timeoutId } = this.createTimeoutController(request.timeoutMs);

    try {
      const payload: Record<string, any> = {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        stream: false,
      };
      if (request.maxTokens !== undefined) payload.max_tokens = request.maxTokens;
      if (request.tools !== undefined) payload.tools = request.tools;
      if (request.toolChoice !== undefined) payload.tool_choice = request.toolChoice;

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const json: any = await response.json();
      const choice = json.choices?.[0];

      return {
        id: json.id,
        content: choice?.message?.content ?? null,
        toolCalls: choice?.message?.tool_calls,
        usage: json.usage
          ? {
              promptTokens: json.usage.prompt_tokens,
              completionTokens: json.usage.completion_tokens,
              totalTokens: json.usage.total_tokens,
            }
          : undefined,
        finishReason: choice?.finish_reason,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  public async *stream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    const url = this.buildUrl('/chat/completions');
    const { controller, timeoutId } = this.createTimeoutController(request.timeoutMs);

    try {
      const payload: Record<string, any> = {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        stream: true,
      };
      if (request.maxTokens !== undefined) payload.max_tokens = request.maxTokens;
      if (request.tools !== undefined) payload.tools = request.tools;
      if (request.toolChoice !== undefined) payload.tool_choice = request.toolChoice;

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      for await (const line of this.readLines(response.body)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') return;
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const choice = parsed.choices?.[0];
            if (choice) {
              yield {
                delta: choice.delta?.content || '',
                finishReason: choice.finish_reason || null,
                toolCalls: choice.delta?.tool_calls,
              };
            }
          } catch {
            // Ignore incomplete line chunks
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Streaming timed out');
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async *readLines(body: any): AsyncIterable<string> {
    let buffer = '';
    const decoder = new TextDecoder('utf-8');

    if (body[Symbol.asyncIterator]) {
      for await (const chunk of body) {
        buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) yield line;
      }
    } else if (body.getReader) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) yield line;
        }
      } finally {
        reader.releaseLock();
      }
    }
    if (buffer.length > 0) {
      yield buffer;
    }
  }

  public async validateCredentials(customEndpoint?: string, apiKey?: string): Promise<ValidationResult> {
    const targetEndpoint = customEndpoint || this.customEndpoint;
    const url = this.buildUrl('/models', targetEndpoint);
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(apiKey),
        signal: AbortSignal.timeout(10000),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorEvent: ProviderErrorEvent = {
          code: 'LOCAL_SERVER_HTTP_ERROR',
          providerId: 'openai_compatible',
          message: `Server returned HTTP status ${response.status}`,
          details: { status: response.status },
        };
        return {
          success: false,
          message: `Error connecting to server (${response.status})`,
          error: errorEvent,
        };
      }

      const json: any = await response.json();
      const availableModels: string[] = Array.isArray(json.data)
        ? json.data.map((m: any) => m.id || m.name).filter(Boolean)
        : [];

      return {
        success: true,
        message: "Успішне з'єднання з OpenAI-сумісним сервером",
        latencyMs,
        availableModels,
      };
    } catch (error: any) {
      const errorEvent: ProviderErrorEvent = {
        code: 'LOCAL_SERVER_UNREACHABLE',
        providerId: 'openai_compatible',
        message: `Не вдалося з'єднатися з локальним ШІ-сервером за адресою ${targetEndpoint}. Перевірте, чи запущено LM Studio / vLLM та чи ввімкнено Local Server.`,
        details: { originalError: error.message },
      };
      return {
        success: false,
        message: errorEvent.message,
        error: errorEvent,
      };
    }
  }
}
