import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionCreationInput } from '../types';
import type { SessionCreationState } from '../types';
import { createSession } from '@/api/sessions';

export const useSessionCreation = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<SessionCreationState>({
    isLoading: false,
    error: null,
    success: false,
  });

  const handleCreateSession = async (data: SessionCreationInput) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await createSession(data);
      setState(prev => ({ ...prev, success: true, isLoading: false }));
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('session_creation.errors.creation_failed');
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      throw error;
    }
  };

  return {
    ...state,
    createSession: handleCreateSession,
  };
};
