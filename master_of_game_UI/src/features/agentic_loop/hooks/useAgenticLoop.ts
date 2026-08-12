import { useState, useCallback, useRef } from 'react';
import type { TurnState, SSEEvent, CompressContextResponse } from '../types';
import { agenticLoopApi } from '../api/agenticLoopApi';

const initialTurnState: TurnState = {
  isStreaming: false,
  stage: 'idle',
  subagent: null,
  statusMessage: null,
  narrativeText: '',
  turnId: null,
  shortLog: null,
  error: null,
  isCompressing: false,
  lastSummary: null,
  compressedLogsCount: null,
  compressionError: null,
};

export const useAgenticLoop = (sessionId?: string) => {
  const [turnState, setTurnState] = useState<TurnState>(initialTurnState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const submitTurn = useCallback(
    async (actionText: string, sessionIdOverride?: string) => {
      const activeSessionId = sessionIdOverride || sessionId;
      if (!activeSessionId) {
        setTurnState((prev) => ({
          ...prev,
          stage: 'error',
          error: 'Session ID is required to submit a turn.',
        }));
        return;
      }

      if (!actionText.trim()) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setTurnState((prev) => ({
        ...prev,
        isStreaming: true,
        stage: 'pre_fetch',
        subagent: null,
        statusMessage: null,
        narrativeText: '',
        turnId: null,
        shortLog: null,
        error: null,
      }));

      const handleEvent = (sseEvent: SSEEvent) => {
        switch (sseEvent.event) {
          case 'status':
            setTurnState((prev) => ({
              ...prev,
              stage: sseEvent.data.stage,
              subagent: sseEvent.data.subagent || null,
              statusMessage: sseEvent.data.message || null,
            }));
            break;
          case 'chunk':
            setTurnState((prev) => ({
              ...prev,
              stage: 'narrative',
              narrativeText: prev.narrativeText + sseEvent.data.delta,
            }));
            break;
          case 'done':
            setTurnState((prev) => ({
              ...prev,
              isStreaming: false,
              stage: 'completed',
              turnId: sseEvent.data.turnId,
              shortLog: sseEvent.data.shortLog,
            }));
            break;
          case 'error':
            setTurnState((prev) => ({
              ...prev,
              isStreaming: false,
              stage: 'error',
              error: sseEvent.data.message,
            }));
            break;
        }
      };

      try {
        await agenticLoopApi.streamTurn(
          { sessionId: activeSessionId, actionText },
          handleEvent,
          controller.signal
        );
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred during turn execution';
        setTurnState((prev) => ({
          ...prev,
          isStreaming: false,
          stage: 'error',
          error: errorMessage,
        }));
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [sessionId]
  );

  const compressContext = useCallback(
    async (sessionIdOverride?: string): Promise<CompressContextResponse | null> => {
      const activeSessionId = sessionIdOverride || sessionId;
      if (!activeSessionId) {
        setTurnState((prev) => ({
          ...prev,
          compressionError: 'Session ID is required to compress context.',
        }));
        return null;
      }

      setTurnState((prev) => ({
        ...prev,
        isCompressing: true,
        compressionError: null,
      }));

      try {
        const response = await agenticLoopApi.compressContext({
          sessionId: activeSessionId,
        });

        setTurnState((prev) => ({
          ...prev,
          isCompressing: false,
          lastSummary: response.summary,
          compressedLogsCount: response.compressedLogsCount,
        }));

        return response;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to compress context';

        setTurnState((prev) => ({
          ...prev,
          isCompressing: false,
          compressionError: errorMessage,
        }));

        return null;
      }
    },
    [sessionId]
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setTurnState((prev) => ({
        ...prev,
        isStreaming: false,
        stage: 'idle',
      }));
    }
  }, []);

  const resetTurnState = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setTurnState(initialTurnState);
  }, []);

  return {
    turnState,
    isStreaming: turnState.isStreaming,
    stage: turnState.stage,
    subagent: turnState.subagent,
    statusMessage: turnState.statusMessage,
    narrativeText: turnState.narrativeText,
    turnId: turnState.turnId,
    shortLog: turnState.shortLog,
    error: turnState.error,
    isCompressing: turnState.isCompressing,
    lastSummary: turnState.lastSummary,
    compressedLogsCount: turnState.compressedLogsCount,
    compressionError: turnState.compressionError,
    submitTurn,
    compressContext,
    cancelStream,
    resetTurnState,
  };
};
