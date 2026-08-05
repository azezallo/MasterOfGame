import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionMetadata } from '@/api/contracts/sessions';
import { fetchSessions } from '../api/sessions.service';

export const useSessions = () => {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
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
    };

    loadData();
  }, []);

  return {
    sessions,
    isLoading,
    error,
  };
};
