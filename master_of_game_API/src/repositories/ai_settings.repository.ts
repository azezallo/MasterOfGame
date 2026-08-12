import Database from 'better-sqlite3';
import { CONFIG } from '../config';
import { UserAISettings, LLMProviderId, EmbeddingProviderId } from '../types/ai.types';
import { DatabaseError } from '../errors/app.errors';

export interface DBUserAISettingsRow {
  user_id: string;
  provider_id: string;
  custom_endpoint: string | null;
  encrypted_api_key: string | null;
  model_name: string;
  temperature: number;
  timeout_ms: number;
  embedding_provider: string;
  is_configured: number;
  created_at: string;
  updated_at: string;
}

export class AISettingsRepository {
  private db: Database.Database;

  constructor(dbPath?: string) {
    this.db = new Database(dbPath || CONFIG.DATABASE_PATH);
    this.init();
  }

  private init(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_ai_settings (
            user_id TEXT PRIMARY KEY,
            provider_id TEXT NOT NULL DEFAULT 'openai_compatible',
            custom_endpoint TEXT DEFAULT 'http://localhost:1234/v1',
            encrypted_api_key TEXT,
            model_name TEXT NOT NULL DEFAULT 'Qwen2.5-7B-Instruct',
            temperature REAL NOT NULL DEFAULT 0.7,
            timeout_ms INTEGER NOT NULL DEFAULT 0,
            embedding_provider TEXT NOT NULL DEFAULT 'fastembed',
            is_configured BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (error) {
      throw new DatabaseError(`Failed to initialize user_ai_settings table: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public findByUserId(userId: string): UserAISettings | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM user_ai_settings WHERE user_id = ?');
      const row = stmt.get(userId) as DBUserAISettingsRow | undefined;
      if (!row) return null;

      return {
        userId: row.user_id,
        providerId: row.provider_id as LLMProviderId,
        customEndpoint: row.custom_endpoint || undefined,
        encryptedApiKey: row.encrypted_api_key,
        modelName: row.model_name,
        temperature: row.temperature,
        timeoutMs: row.timeout_ms,
        embeddingProvider: row.embedding_provider as EmbeddingProviderId,
        isConfigured: Boolean(row.is_configured),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      throw new DatabaseError(`Failed to fetch user AI settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public upsertSettings(settings: UserAISettings): UserAISettings {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_ai_settings (
          user_id, provider_id, custom_endpoint, encrypted_api_key, model_name,
          temperature, timeout_ms, embedding_provider, is_configured, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          provider_id = excluded.provider_id,
          custom_endpoint = excluded.custom_endpoint,
          encrypted_api_key = excluded.encrypted_api_key,
          model_name = excluded.model_name,
          temperature = excluded.temperature,
          timeout_ms = excluded.timeout_ms,
          embedding_provider = excluded.embedding_provider,
          is_configured = excluded.is_configured,
          updated_at = CURRENT_TIMESTAMP
      `);

      stmt.run(
        settings.userId,
        settings.providerId,
        settings.customEndpoint || null,
        settings.encryptedApiKey || null,
        settings.modelName,
        settings.temperature,
        settings.timeoutMs,
        settings.embeddingProvider,
        settings.isConfigured ? 1 : 0
      );

      return this.findByUserId(settings.userId)!;
    } catch (error) {
      throw new DatabaseError(`Failed to upsert user AI settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public deleteByUserId(userId: string): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM user_ai_settings WHERE user_id = ?');
      const result = stmt.run(userId);
      return result.changes > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to delete user AI settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public close(): void {
    this.db.close();
  }
}
