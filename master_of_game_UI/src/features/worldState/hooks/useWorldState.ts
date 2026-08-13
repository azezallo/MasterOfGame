import { useState, useEffect, useCallback } from 'react';
import { fetchWorldState } from '../api/worldStateApi';
import type { WorldState } from '../types/worldState';

interface UseWorldStateParams {
  sessionId: string;
}

export function useWorldState({ sessionId }: UseWorldStateParams) {
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorldState = useCallback(async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWorldState(sessionId);
      setWorldState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load world state');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadWorldState();

    const handleTurnCompleted = () => {
      loadWorldState();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('game:turn_completed', handleTurnCompleted);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('game:turn_completed', handleTurnCompleted);
      }
    };
  }, [loadWorldState]);

  return {
    worldState,
    isLoading,
    error,
    refetchWorldState: loadWorldState,
  };
}
