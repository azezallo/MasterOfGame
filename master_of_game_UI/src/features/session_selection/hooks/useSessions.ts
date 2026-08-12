import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionMetadata } from '@/api/contracts/sessions';
import type { GetMeResponse } from '@/api/contracts/auth';
import { fetchSessions } from '../api/sessions.service';

export const useSessions = (user?: GetMeResponse | null) => {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchSessions();
      setSessions(data);
    } catch {
      setError(t('session_selection.errors.fetch_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user !== null) {
      loadData();
    }
  }, [loadData, user]);

  return {
    sessions,
    isLoading,
    error,
    refetch: loadData,
  };
};
