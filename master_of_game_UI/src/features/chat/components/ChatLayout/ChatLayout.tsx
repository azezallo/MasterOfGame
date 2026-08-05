import React from 'react';
import { MainChat } from '../MainChat/MainChat';
import { LeftSidebar } from '../Sidebars/LeftSidebar';
import { RightSidebar } from '../Sidebars/RightSidebar';
import { useChat } from '../../hooks/useChat';
import styles from './ChatLayout.module.css';

interface ChatLayoutProps {
  sessionId: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ sessionId }) => {
  const { messages, status, isProcessing, isLoadingHistory, sendMessage } = useChat(sessionId);

  if (isLoadingHistory) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Завантаження сесії...</p>
      </div>
    );
  }

  return (
    <div className={styles.layoutContainer}>
      <aside className={`${styles.sidebar} ${styles.leftSidebar}`}>
        <LeftSidebar />
      </aside>

      <main className={styles.mainContent}>
        <MainChat
          messages={messages}
          status={status}
          isProcessing={isProcessing}
          onSendMessage={sendMessage}
        />
      </main>

      <aside className={`${styles.sidebar} ${styles.rightSidebar}`}>
        <RightSidebar />
      </aside>
    </div>
  );
};
