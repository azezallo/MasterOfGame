import { useState, useEffect, useCallback } from 'react';
import type { PlayerStateProfile } from '../types/playerState';
import { fetchPlayerState } from '../api/playerStateApi';

export interface UsePlayerStateResult {
  playerState: PlayerStateProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePlayerState(sessionId: string): UsePlayerStateResult {
  const [playerState, setPlayerState] = useState<PlayerStateProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlayerState(sessionId);
      setPlayerState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити стан гравця');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadState();

    const handleTurnCompleted = () => {
      loadState();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('game:turn_completed', handleTurnCompleted);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('game:turn_completed', handleTurnCompleted);
      }
    };
  }, [loadState]);

  return {
    playerState,
    loading,
    error,
    refetch: loadState,
  };
}
