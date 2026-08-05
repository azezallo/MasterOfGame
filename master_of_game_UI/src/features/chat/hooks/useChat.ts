import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, GameStatus } from '../types';
import { mockChatApi } from '../api/mockChatApi';

export const useChat = (sessionId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const pollStepRef = useRef(0);

  useEffect(() => {
    if (!sessionId) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const data = await mockChatApi.fetchHistory(sessionId);
        setMessages(data.messages);
        setStatus(data.status);
      } catch (error) {
        console.error('Failed to load chat history', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [sessionId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    // Add player message optimistically
    const playerMsg: ChatMessage = {
      id: Date.now().toString(),
      type: 'player',
      text: text
    };
    
    setMessages(prev => [...prev, playerMsg]);
    setIsProcessing(true);
    setStatus('GATHERING_MEMORY');
    pollStepRef.current = 0;

    try {
      await mockChatApi.sendMessage(text);
      
      // Start polling logic using recursive setTimeout to avoid overlapping calls
      const poll = async () => {
        try {
          const result = await mockChatApi.pollGameStatus(pollStepRef.current);
          setStatus(result.status);
          
          if (result.isReady) {
            setIsProcessing(false);
            setStatus('IDLE');
            
            if (result.message) {
              const masterMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'master',
                text: result.message
              };
              setMessages(prev => [...prev, masterMsg]);
            }
          } else {
            pollStepRef.current += 1;
            // Schedule next poll only after the current one finishes
            setTimeout(poll, 1500);
          }
        } catch (error) {
          console.error('Polling error', error);
          setIsProcessing(false);
          setStatus('IDLE');
        }
      };

      // Start the first poll
      setTimeout(poll, 1500);

    } catch (error) {
      console.error('Failed to send message', error);
      setIsProcessing(false);
      setStatus('IDLE');
    }

  }, [isProcessing]);

  return {
    messages,
    status,
    isProcessing,
    isLoadingHistory,
    sendMessage
  };
};
