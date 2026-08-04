import { useState, useEffect } from 'react';
import type { SessionMetadata } from '@/api/contracts/sessions';
import { fetchSessions } from '../api/sessions.service';

export const useSessions = () => {
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
        setError('Помилка при завантаженні даних');
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
