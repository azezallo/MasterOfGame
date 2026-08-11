import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage, GameStatus } from '../../types';
import { useWorldState, WorldStateWidget } from '@/features/worldState';
import styles from './MainChat.module.css';

interface MainChatProps {
  sessionId?: string;
  messages: ChatMessage[];
  status: GameStatus;
  isProcessing: boolean;
  onSendMessage: (content: string) => void;
}

export const MainChat: React.FC<MainChatProps> = ({
  sessionId = '',
  messages,
  status,
  isProcessing,
  onSendMessage,
}) => {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { worldState, isLoading: isLoadingWorldState } = useWorldState({ sessionId });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = e.currentTarget.value;
      if (text.trim() && !isProcessing) {
        onSendMessage(text);
        e.currentTarget.value = '';
      }
    }
  };

  const getStatusText = (status: GameStatus) => {
    switch (status) {
      case 'GATHERING_MEMORY': return t('chat.master_status.gathering_memory');
      case 'READING_MAP': return t('chat.master_status.reading_map');
      case 'GENERATING_NARRATIVE': return t('chat.master_status.generating_narrative');
      default: return '';
    }
  };

  return (
    <div className={styles.dialogContainer}>
      <WorldStateWidget worldState={worldState} isLoading={isLoadingWorldState} />
      <div className={styles.messagesArea}>
        {messages.map((msg) => {
          const typeSuffix = msg.type.charAt(0).toUpperCase() + msg.type.slice(1);
          return (
            <div key={msg.id} className={`${styles.message} ${styles[`message${typeSuffix}`]}`}>
              <div className={styles.content}>{msg.text}</div>
            </div>
          );
        })}

        {isProcessing && (
          <div className={`${styles.message} ${styles.messageSystem}`}>
            <div className={styles.content}>{getStatusText(status)}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <textarea
          ref={inputRef}
          className={styles.input}
          placeholder={t('chat.placeholder')}
          disabled={isProcessing}
          onKeyDown={handleKeyDown}
          rows={3}
        />
      </div>
    </div>
  );
};
