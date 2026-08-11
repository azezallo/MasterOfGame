import React, { useState } from 'react';
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
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

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
      <header className={styles.mobileHeader}>
        <button onClick={() => setIsLeftSidebarOpen(true)} className={styles.hamburgerBtn}>
          ☰ Герой
        </button>
        <span className={styles.mobileTitle}>Master of Game</span>
        <button onClick={() => setIsRightSidebarOpen(true)} className={styles.hamburgerBtn}>
          Світ ☰
        </button>
      </header>

      <aside className={`${styles.sidebar} ${styles.leftSidebar} ${isLeftSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.closeMobileSidebar} onClick={() => setIsLeftSidebarOpen(false)}>✕ Закрити</div>
        <LeftSidebar sessionId={sessionId} />
      </aside>

      {(isLeftSidebarOpen || isRightSidebarOpen) && (
        <div 
          className={styles.mobileOverlay} 
          onClick={() => {
            setIsLeftSidebarOpen(false);
            setIsRightSidebarOpen(false);
          }}
        />
      )}

      <main className={styles.mainContent}>
        <MainChat
          sessionId={sessionId}
          messages={messages}
          status={status}
          isProcessing={isProcessing}
          onSendMessage={sendMessage}
        />
      </main>

      <aside className={`${styles.sidebar} ${styles.rightSidebar} ${isRightSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.closeMobileSidebar} onClick={() => setIsRightSidebarOpen(false)}>✕ Закрити</div>
        <RightSidebar sessionId={sessionId} />
      </aside>
    </div>
  );
};
