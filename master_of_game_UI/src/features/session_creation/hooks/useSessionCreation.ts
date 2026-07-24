import { useState } from 'react';
import type { SessionCreationInput } from '../types';
import type { SessionCreationState } from '../types';
import { createSession } from '@/api/sessions';

export const useSessionCreation = () => {
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
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message || 'Помилка створення сесії', isLoading: false }));
      throw err;
    }
  };

  return {
    ...state,
    createSession: handleCreateSession,
  };
};
