import React from 'react';
import styles from './Dialogue.module.css';
import type { Message } from './types';

interface DialogueProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export const Dialogue: React.FC<DialogueProps> = ({ messages, onSendMessage }) => {
  return (
    <div className={styles.dialogContainer}>
      <div className={styles.messagesArea}>
        {messages.map((msg) => {
          const typeSuffix = msg.type.charAt(0).toUpperCase() + msg.type.slice(1);
          return (
            <div key={msg.id} className={`${styles.message} ${styles[`message${typeSuffix}`]}`}>
              {msg.type === 'player' && <div className={styles.speaker}>{msg.sender}:</div>}
              <div className={styles.content}>{msg.content}</div>
            </div>
          );
        })}
      </div>
      <div className={styles.inputArea}>
        <input
          type="text"
          className={styles.input}
          placeholder="Напишіть вашу дію..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSendMessage(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>
    </div>
  );
};
