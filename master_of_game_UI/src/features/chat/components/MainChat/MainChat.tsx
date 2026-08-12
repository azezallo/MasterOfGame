import React, { useEffect, useRef } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types';
import type { TurnStage, SubagentGroup } from '@/features/agentic_loop';
import { useWorldState, WorldStateWidget } from '@/features/worldState';
import { useMapNavigation } from '@/features/map/hooks/useMapNavigation';
import { TurnProgressIndicator } from '@/features/agentic_loop';
import { ChatMessage } from '../ChatMessage/ChatMessage';
import { ChatInput } from '../ChatInput/ChatInput';
import styles from './MainChat.module.css';

interface MainChatProps {
  sessionId?: string;
  messages: ChatMessageType[];
  isStreaming: boolean;
  stage: TurnStage;
  subagent?: SubagentGroup | null;
  statusMessage?: string | null;
  narrativeText?: string;
  onSendMessage: (content: string) => void;
  onCancelStream?: () => void;
}

export const MainChat: React.FC<MainChatProps> = ({
  sessionId = '',
  messages,
  isStreaming,
  stage,
  subagent,
  statusMessage,
  narrativeText = '',
  onSendMessage,
  onCancelStream,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { worldState, isLoading: isLoadingWorldState } = useWorldState({ sessionId });
  const { currentLocation } = useMapNavigation(sessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, narrativeText, stage]);

  return (
    <div className={styles.dialogContainer}>
      <WorldStateWidget
        worldState={worldState}
        isLoading={isLoadingWorldState}
        manaDensity={currentLocation?.environmental_state?.mana_density ?? 50}
      />

      <div className={styles.messagesArea}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isStreaming && (
          <TurnProgressIndicator
            stage={stage}
            subagent={subagent}
            statusMessage={statusMessage}
            onCancel={onCancelStream}
          />
        )}

        {isStreaming && stage === 'narrative' && narrativeText && (
          <ChatMessage
            message={{
              id: 'streaming_narrative',
              type: 'master',
              text: narrativeText,
            }}
            isStreaming={true}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <ChatInput onSendMessage={onSendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
};
