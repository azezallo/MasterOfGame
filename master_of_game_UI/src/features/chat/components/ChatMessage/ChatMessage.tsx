import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../types';
import styles from './ChatMessage.module.css';

export interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

function parseInlineTokens(text: string): React.ReactNode[] {
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|_.*?_|`.*?`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={index}>{parseInlineTokens(part.slice(2, -2))}</strong>;
    }
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return <em key={index}>{parseInlineTokens(part.slice(1, -1))}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className={styles.inlineCode}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function renderFormattedMarkdown(text: string): React.ReactNode {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n');
    const lineContent = lines.map((line, lIdx) => {
      if (line.startsWith('> ')) {
        return (
          <blockquote key={lIdx} className={styles.blockquote}>
            {parseInlineTokens(line.slice(2))}
          </blockquote>
        );
      }
      return (
        <React.Fragment key={lIdx}>
          {lIdx > 0 && <br />}
          {parseInlineTokens(line)}
        </React.Fragment>
      );
    });

    return (
      <p key={pIdx} className={styles.paragraph}>
        {lineContent}
      </p>
    );
  });
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming = false }) => {
  const { type, text, speaker, timestamp } = message;

  if (type === 'system') {
    return (
      <div className={styles.systemWrapper}>
        <div className={styles.systemBubble}>
          <span className={styles.systemIcon}>ℹ️</span>
          <span>{text}</span>
        </div>
      </div>
    );
  }

  if (type === 'player') {
    return (
      <div className={styles.playerWrapper}>
        <div className={styles.playerBubble}>
          {speaker && <div className={styles.speakerName}>{speaker}</div>}
          <div className={styles.messageContent}>{text}</div>
          {timestamp && <div className={styles.timestamp}>{timestamp}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.masterWrapper}>
      <div className={`${styles.masterBubble} ${isStreaming ? styles.streaming : ''}`}>
        <div className={styles.masterHeader}>
          <span className={styles.masterBadge}>🌌 Наративний Майстер</span>
        </div>
        <div className={styles.messageContent}>
          {renderFormattedMarkdown(text)}
          {isStreaming && <span className={styles.cursor} />}
        </div>
        {timestamp && <div className={styles.timestamp}>{timestamp}</div>}
      </div>
    </div>
  );
};
