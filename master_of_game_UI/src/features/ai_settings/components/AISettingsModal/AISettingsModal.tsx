import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AISettingsModal.module.css';
import type { LLMProviderId, EmbeddingProviderId } from '../../types';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  isSaving: boolean;
  isTesting: boolean;
  isFetchingModels: boolean;
  formValues: {
    providerId: LLMProviderId;
    customEndpoint?: string;
    modelName: string;
    temperature: number;
    timeoutMs: number;
    embeddingProvider: EmbeddingProviderId;
    apiKey?: string | null;
  };
  setFormValues: React.Dispatch<React.SetStateAction<any>>;
  noTimeout: boolean;
  onNoTimeoutToggle: (checked: boolean) => void;
  availableModels: string[];
  testResult: any;
  serverError: string | null;
  onProviderChange: (providerId: LLMProviderId) => void;
  onFetchModels: () => void;
  onTestConnection: () => void;
  onSave: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  isSaving,
  isTesting,
  isFetchingModels,
  formValues,
  setFormValues,
  noTimeout,
  onNoTimeoutToggle,
  availableModels,
  testResult,
  serverError,
  onProviderChange,
  onFetchModels,
  onTestConnection,
  onSave,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isLocal = formValues.providerId === 'openai_compatible';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>⚙️ {t('ai_settings.title', 'Налаштування ШІ (AI Settings)')}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.body}>
          {serverError && <div className={styles.serverErrorAlert}>{serverError}</div>}

          {/* Section 1: LLM */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>1. {t('ai_settings.main_llm', 'ГОЛОВНА LLM МОДЕЛЬ')}</div>

            {/* Provider */}
            <div className={styles.field}>
              <label>{t('ai_settings.provider', 'Провайдер')}:</label>
              <select
                value={formValues.providerId}
                onChange={(e) => onProviderChange(e.target.value as LLMProviderId)}
                disabled={isLoading || isSaving}
              >
                <option value="openai_compatible">OpenAI-Compatible (LM Studio / vLLM / Local Server)</option>
                <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet / Haiku)</option>
                <option value="gemini">Google Gemini (Gemini 2.0 Flash / Pro)</option>
              </select>
            </div>

            {/* Custom Endpoint for Local */}
            {isLocal && (
              <div className={styles.field}>
                <label>{t('ai_settings.base_url', 'Base URL сервера')}:</label>
                <input
                  type="text"
                  value={formValues.customEndpoint || ''}
                  onChange={(e) => setFormValues((prev: any) => ({ ...prev, customEndpoint: e.target.value }))}
                  placeholder="http://localhost:1234/v1"
                />
              </div>
            )}

            {/* Model Selection */}
            <div className={styles.field}>
              <label>{t('ai_settings.model_name', 'Назва моделі')}:</label>
              <div className={styles.inputGroup}>
                {availableModels.length > 0 ? (
                  <select
                    value={formValues.modelName}
                    onChange={(e) => setFormValues((prev: any) => ({ ...prev, modelName: e.target.value }))}
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formValues.modelName}
                    onChange={(e) => setFormValues((prev: any) => ({ ...prev, modelName: e.target.value }))}
                    placeholder="Qwen2.5-7B-Instruct"
                  />
                )}

                {isLocal && (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={onFetchModels}
                    disabled={isFetchingModels}
                  >
                    {isFetchingModels ? '...' : t('ai_settings.fetch_models', 'Список моделей')}
                  </button>
                )}
              </div>
            </div>

            {/* API Key */}
            <div className={styles.field}>
              <label>
                {t('ai_settings.api_key', 'API Key')} {isLocal ? '(Опціонально)' : '(Обов\'язково)'}:
              </label>
              <input
                type="password"
                value={formValues.apiKey || ''}
                onChange={(e) => setFormValues((prev: any) => ({ ...prev, apiKey: e.target.value }))}
                placeholder={isLocal ? 'Залиште порожнім, якщо не потрібно' : '••••••••••••••••••••'}
              />
            </div>

            {/* Temperature */}
            <div className={styles.field}>
              <label>{t('ai_settings.temperature', 'Температура')}:</label>
              <div className={styles.rangeGroup}>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={formValues.temperature}
                  onChange={(e) => setFormValues((prev: any) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                />
                <span className={styles.rangeValue}>{formValues.temperature.toFixed(2)}</span>
              </div>
            </div>

            {/* Timeout */}
            <div className={styles.field}>
              <label>{t('ai_settings.timeout', 'Таймаут запиту (секунди)')}:</label>
              <input
                type="number"
                disabled={noTimeout}
                value={noTimeout ? 0 : formValues.timeoutMs / 1000}
                onChange={(e) =>
                  setFormValues((prev: any) => ({
                    ...prev,
                    timeoutMs: Math.max(0, parseInt(e.target.value || '0', 10) * 1000),
                  }))
                }
              />
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={noTimeout}
                  onChange={(e) => onNoTimeoutToggle(e.target.checked)}
                />
                {t('ai_settings.no_timeout', 'Без таймауту (Чекати скільки завгодно)')}
              </label>
            </div>
          </div>

          {/* Section 2: Embeddings */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>2. {t('ai_settings.embeddings', 'МОДЕЛЬ ВЕКТОРИЗАЦІЇ (EMBEDDINGS - F017)')}</div>
            <div className={styles.field}>
              <label>{t('ai_settings.embedding_provider', 'Тип векторизатора')}:</label>
              <select
                value={formValues.embeddingProvider}
                onChange={(e) => setFormValues((prev: any) => ({ ...prev, embeddingProvider: e.target.value as EmbeddingProviderId }))}
              >
                <option value="fastembed">FastEmbed (Локально в Node.js / CPU)</option>
                <option value="openai">OpenAI text-embedding-3-small (Cloud)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {testResult && (
              testResult.success ? (
                <span className={styles.statusSuccess} title={testResult.message}>
                  ✅ {testResult.latencyMs !== undefined ? `${testResult.latencyMs} мс` : 'ОК'}
                </span>
              ) : (
                <span
                  className={styles.statusError}
                  title={testResult.message || testResult.error?.message || 'Помилка підключення'}
                >
                  ❌ {testResult.message || testResult.error?.message || 'Помилка'}
                </span>
              )
            )}
          </div>
          <div className={styles.footerButtons}>
            <button
              type="button"
              className={styles.testBtn}
              onClick={onTestConnection}
              disabled={isTesting || isSaving}
            >
              {isTesting ? '...' : t('ai_settings.test_connection', 'Тестувати з\'єднання')}
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? '...' : t('ai_settings.save', 'Зберегти')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
