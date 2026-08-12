import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '../types';
import { useAgenticLoop, agenticLoopApi } from '@/features/agentic_loop';

export const useChat = (sessionId: string) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const lastProcessedTurnIdRef = useRef<string | null>(null);

  const defaultInitialMessage: ChatMessage = {
    id: 'welcome_1',
    type: 'master',
    text: t('chat.default_initial_message', 'Ви прокидаєтесь у тьмяно освітленій кімнаті. Холодна кам\'яна підлога неприємно холодить спину. Повітря просякнуте запахом вогкості та старої сталі.'),
  };

  const agenticLoop = useAgenticLoop(sessionId);
  const {
    submitTurn,
    isStreaming,
    stage,
    subagent,
    statusMessage,
    narrativeText,
    turnId,
    error,
    isCompressing,
    compressedLogsCount,
    compressContext: agenticCompressContext,
    resetTurnState,
  } = agenticLoop;

  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const historyMessages = await agenticLoopApi.fetchHistory(sessionId);
        if (isMounted) {
          if (historyMessages && historyMessages.length > 0) {
            setMessages(historyMessages);
          } else {
            setMessages([defaultInitialMessage]);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history', err);
        if (isMounted) {
          setMessages([defaultInitialMessage]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (stage === 'completed' && narrativeText) {
      const currentTurnId = turnId || `turn_${Date.now()}`;
      if (lastProcessedTurnIdRef.current !== currentTurnId) {
        lastProcessedTurnIdRef.current = currentTurnId;

        setMessages((prev) => [
          ...prev,
          {
            id: currentTurnId,
            type: 'master',
            text: narrativeText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }
  }, [stage, narrativeText, turnId]);

  useEffect(() => {
    if (stage === 'error' && error) {
      // Auto-recover check: If backend completed turn asynchronously after SSE disconnection, fetch history
      const timer = setTimeout(async () => {
        try {
          const historyMessages = await agenticLoopApi.fetchHistory(sessionId);
          if (historyMessages && historyMessages.length > 0) {
            setMessages(historyMessages);
            return;
          }
        } catch {}

        setMessages((prev) => [
          ...prev,
          {
            id: `error_${Date.now()}`,
            type: 'system',
            text: `Помилка виконання ходу: ${error}`,
          },
        ]);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [stage, error, sessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const playerMsg: ChatMessage = {
        id: `player_${Date.now()}`,
        type: 'player',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, playerMsg]);
      await submitTurn(text.trim());
    },
    [isStreaming, submitTurn]
  );

  const compressContext = useCallback(async () => {
    const res = await agenticCompressContext();
    if (res && res.success) {
      setMessages((prev) => [
        ...prev,
        {
          id: `compress_${Date.now()}`,
          type: 'system',
          text: `Главу успішно завершено! Стиснено записів логу: ${res.compressedLogsCount}.`,
        },
      ]);
    }
    return res;
  }, [agenticCompressContext]);

  return {
    messages,
    isLoadingHistory,
    isStreaming,
    stage,
    subagent,
    statusMessage,
    narrativeText,
    error,
    isCompressing,
    compressedLogsCount,
    sendMessage,
    compressContext,
    cancelStream: agenticLoop.cancelStream,
    resetTurnState,
  };
};
