import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '../types';
import { useAgenticLoop, agenticLoopApi, type SSEEvent } from '@/features/agentic_loop';

export const useChat = (sessionId: string) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Live Reconnection SSE stream states
  const [reconnectStage, setReconnectStage] = useState<string | null>(null);
  const [reconnectSubagent, setReconnectSubagent] = useState<any | null>(null);
  const [reconnectMessage, setReconnectMessage] = useState<string | null>(null);
  const [reconnectText, setReconnectText] = useState<string>('');

  const lastProcessedTurnIdRef = useRef<string | null>(null);
  const reconnectControllerRef = useRef<AbortController | null>(null);

  const defaultInitialMessage: ChatMessage = {
    id: 'welcome_1',
    type: 'master',
    text: t(
      'chat.default_initial_message',
      'Ви прокидаєтесь у тьмяно освітленій кімнаті. Холодна кам\'яна підлога неприємно холодить спину. Повітря просякнуте запахом вогкості та старої сталі.'
    ),
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
    const loadHistoryAndReconnect = async () => {
      setIsLoadingHistory(true);
      try {
        const { messages: historyMessages, isTurnInProgress } = await agenticLoopApi.fetchHistory(
          sessionId
        );
        if (!isMounted) return;

        if (historyMessages && historyMessages.length > 0) {
          setMessages(historyMessages);
        } else {
          setMessages([defaultInitialMessage]);
        }

        // Auto-reconnect to live SSE stream if a turn is currently in progress!
        if (isTurnInProgress) {
          setReconnectStage('master_eval');
          setReconnectMessage(
            t('agentic_loop.messages.reconnect', 'Відновлення зв\'язку з живим стрімом Майстра...')
          );
          setReconnectText('');

          if (reconnectControllerRef.current) {
            reconnectControllerRef.current.abort();
          }

          const controller = new AbortController();
          reconnectControllerRef.current = controller;

          const handleReconnectEvent = (event: SSEEvent) => {
            if (!isMounted) return;

            switch (event.event) {
              case 'status':
                if (event.data.stage === 'idle') {
                  setReconnectStage(null);
                  setReconnectMessage(null);
                  setReconnectSubagent(null);
                } else {
                  setReconnectStage(event.data.stage);
                  setReconnectSubagent(event.data.subagent || null);
                  setReconnectMessage(event.data.message || null);
                }
                break;
              case 'chunk':
                setReconnectStage('narrative');
                setReconnectText((prev) => prev + event.data.delta);
                break;
              case 'done':
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('game:turn_completed'));
                }
                break;
              case 'error':
                setReconnectStage(null);
                setReconnectMessage(null);
                setReconnectSubagent(null);
                break;
            }
          };

          try {
            await agenticLoopApi.reconnectStream(sessionId, handleReconnectEvent, controller.signal);
          } catch {
            // Reconnection stream error
          } finally {
            if (isMounted) {
              try {
                const finalHist = await agenticLoopApi.fetchHistory(sessionId);
                if (finalHist && finalHist.messages && finalHist.messages.length > 0) {
                  setMessages(finalHist.messages);
                }
              } catch {}
              setReconnectStage(null);
              setReconnectMessage(null);
              setReconnectSubagent(null);
              setReconnectText('');
            }
          }
        } else {
          setReconnectStage(null);
          setReconnectMessage(null);
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

    loadHistoryAndReconnect();

    return () => {
      isMounted = false;
      if (reconnectControllerRef.current) {
        reconnectControllerRef.current.abort();
      }
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
      const timer = setTimeout(async () => {
        try {
          const { messages: historyMessages } = await agenticLoopApi.fetchHistory(sessionId);
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
      if (!text.trim() || isStreaming || Boolean(reconnectStage)) return;

      const playerMsg: ChatMessage = {
        id: `player_${Date.now()}`,
        type: 'player',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, playerMsg]);
      await submitTurn(text.trim());
    },
    [isStreaming, reconnectStage, submitTurn]
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

  const effectiveStage = reconnectStage || stage;
  const effectiveSubagent = reconnectSubagent || subagent;
  const effectiveStatusMessage = reconnectMessage || statusMessage;
  const effectiveNarrativeText = reconnectText || narrativeText;
  const effectiveIsStreaming = isStreaming || Boolean(reconnectStage);

  return {
    messages,
    isLoadingHistory,
    isStreaming: effectiveIsStreaming,
    stage: effectiveStage as any,
    subagent: effectiveSubagent,
    statusMessage: effectiveStatusMessage,
    narrativeText: effectiveNarrativeText,
    error,
    isCompressing,
    compressedLogsCount,
    sendMessage,
    compressContext,
    cancelStream: agenticLoop.cancelStream,
    resetTurnState,
  };
};
