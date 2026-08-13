import { useState, useEffect, useCallback } from 'react';
import type {
  AISettingsFormValues,
  AISettingsResponse,
  TestConnectionResponse,
} from '../types';
import {
  DEFAULT_ENDPOINTS,
  PRESET_MODELS,
} from '../types';
import {
  getAISettings,
  saveAISettings,
  testAIConnection,
  fetchModelsFromEndpoint,
} from '../api/aiSettingsApi';

export function useAISettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const [formValues, setFormValues] = useState<AISettingsFormValues>({
    providerId: 'openai_compatible',
    customEndpoint: 'http://localhost:1234/v1',
    modelName: 'Qwen2.5-7B-Instruct',
    temperature: 0.7,
    timeoutMs: 0,
    maxContextTokens: 32000,
    embeddingProvider: 'fastembed',
    apiKey: '',
  });

  const [noTimeout, setNoTimeout] = useState(true);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setServerError(null);
    try {
      const data: AISettingsResponse = await getAISettings();
      setFormValues({
        providerId: data.providerId || 'openai_compatible',
        customEndpoint: data.customEndpoint || DEFAULT_ENDPOINTS[data.providerId] || 'http://localhost:1234/v1',
        modelName: data.modelName || 'Qwen2.5-7B-Instruct',
        temperature: data.temperature ?? 0.7,
        timeoutMs: data.timeoutMs ?? 0,
        maxContextTokens: data.maxContextTokens ?? 32000,
        embeddingProvider: data.embeddingProvider || 'fastembed',
        apiKey: '',
      });
      setNoTimeout(data.timeoutMs === 0);

      // Auto open if not configured
      if (!data.isConfigured) {
        setIsOpen(true);
      }
    } catch (err: any) {
      setServerError(err.message || 'Помилка завантаження налаштувань ШІ');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const handleProviderChange = (providerId: AISettingsFormValues['providerId']) => {
    setTestResult(null);
    const defaultEndpoint = DEFAULT_ENDPOINTS[providerId] || '';
    const defaultModel = PRESET_MODELS[providerId]?.[0] || '';
    setFormValues((prev) => ({
      ...prev,
      providerId,
      customEndpoint: defaultEndpoint,
      modelName: defaultModel,
    }));
    setAvailableModels(PRESET_MODELS[providerId] || []);
  };

  const handleNoTimeoutToggle = (checked: boolean) => {
    setNoTimeout(checked);
    setFormValues((prev) => ({
      ...prev,
      timeoutMs: checked ? 0 : 180,
    }));
  };

  const handleFetchModels = async () => {
    if (formValues.providerId !== 'openai_compatible' || !formValues.customEndpoint) return;
    setIsFetchingModels(true);
    setServerError(null);
    try {
      const models = await fetchModelsFromEndpoint(formValues.customEndpoint, formValues.apiKey);
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(formValues.modelName)) {
        setFormValues((prev) => ({ ...prev, modelName: models[0] }));
      }
    } catch (err: any) {
      setServerError(`Не вдалося завантажити список моделей: ${err.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setServerError(null);
    try {
      const res = await testAIConnection({
        providerId: formValues.providerId,
        customEndpoint: formValues.customEndpoint,
        apiKey: formValues.apiKey || null,
      });
      setTestResult(res);
      if (res.success && res.availableModels && res.availableModels.length > 0) {
        setAvailableModels(res.availableModels);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Помилка підключення',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setServerError(null);
    try {
      await saveAISettings({
        providerId: formValues.providerId,
        customEndpoint: formValues.customEndpoint,
        modelName: formValues.modelName,
        temperature: formValues.temperature,
        timeoutMs: noTimeout ? 0 : formValues.timeoutMs,
        maxContextTokens: formValues.maxContextTokens,
        embeddingProvider: formValues.embeddingProvider,
        apiKey: formValues.apiKey || undefined,
      });
      setIsOpen(false);
    } catch (err: any) {
      setServerError(err.message || 'Не вдалося зберегти налаштування');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isOpen,
    openModal,
    closeModal,
    isLoading,
    isSaving,
    isTesting,
    isFetchingModels,
    formValues,
    setFormValues,
    noTimeout,
    handleNoTimeoutToggle,
    availableModels,
    testResult,
    serverError,
    handleProviderChange,
    handleFetchModels,
    handleTestConnection,
    handleSave,
    loadSettings,
  };
}
