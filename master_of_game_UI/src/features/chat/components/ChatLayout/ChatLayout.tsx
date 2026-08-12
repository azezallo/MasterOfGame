import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainChat } from '../MainChat/MainChat';
import { LeftSidebar } from '../Sidebars/LeftSidebar';
import { RightSidebar } from '../Sidebars/RightSidebar';
import { useChat } from '../../hooks/useChat';
import { useAISettings, AISettingsModal } from '@/features/ai_settings';
import { CompressContextButton } from '@/features/agentic_loop';
import styles from './ChatLayout.module.css';

interface ChatLayoutProps {
  sessionId: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const {
    messages,
    isLoadingHistory,
    isStreaming,
    stage,
    subagent,
    statusMessage,
    narrativeText,
    isCompressing,
    compressedLogsCount,
    sendMessage,
    compressContext,
    cancelStream,
  } = useChat(sessionId);

  const aiSettings = useAISettings();
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  if (isLoadingHistory) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>{t('chat.loading_session', 'Завантаження сесії...')}</p>
      </div>
    );
  }

  return (
    <div className={styles.layoutContainer}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            onClick={() => setIsLeftSidebarOpen((prev) => !prev)}
            className={`${styles.mobileToggleBtn} ${styles.leftToggle}`}
          >
            {t('chat.mobile.hero_toggle', '☰ Герой')}
          </button>
          <h1 className={styles.headerTitle}>Master of Game</h1>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.aiSettingsBtn}
            onClick={aiSettings.openModal}
            title={t('ai_settings.title', 'Налаштування ШІ')}
          >
            <span>⚙️</span>
            <span className={styles.btnLabel}>
              {t('chat.ai_settings_button', 'Налаштування ШІ')}
            </span>
          </button>

          <CompressContextButton
            onCompress={compressContext}
            isCompressing={isCompressing}
            disabled={isStreaming}
            compressedLogsCount={compressedLogsCount}
          />

          <button
            type="button"
            onClick={() => setIsRightSidebarOpen((prev) => !prev)}
            className={`${styles.mobileToggleBtn} ${styles.rightToggle}`}
          >
            {t('chat.mobile.world_toggle', 'Світ ☰')}
          </button>
        </div>
      </header>

      <div className={styles.contentBody}>
        <aside
          className={`${styles.sidebar} ${styles.leftSidebar} ${
            isLeftSidebarOpen ? styles.sidebarOpen : ''
          }`}
        >
          <div
            className={styles.closeMobileSidebar}
            onClick={() => setIsLeftSidebarOpen(false)}
          >
            {t('chat.mobile.close', '✕ Закрити')}
          </div>
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
            isStreaming={isStreaming}
            stage={stage}
            subagent={subagent}
            statusMessage={statusMessage}
            narrativeText={narrativeText}
            onSendMessage={sendMessage}
            onCancelStream={cancelStream}
          />
        </main>

        <aside
          className={`${styles.sidebar} ${styles.rightSidebar} ${
            isRightSidebarOpen ? styles.sidebarOpen : ''
          }`}
        >
          <div
            className={styles.closeMobileSidebar}
            onClick={() => setIsRightSidebarOpen(false)}
          >
            {t('chat.mobile.close', '✕ Закрити')}
          </div>
          <RightSidebar sessionId={sessionId} />
        </aside>
      </div>

      <AISettingsModal
        isOpen={aiSettings.isOpen}
        onClose={aiSettings.closeModal}
        isLoading={aiSettings.isLoading}
        isSaving={aiSettings.isSaving}
        isTesting={aiSettings.isTesting}
        isFetchingModels={aiSettings.isFetchingModels}
        formValues={aiSettings.formValues}
        setFormValues={aiSettings.setFormValues}
        noTimeout={aiSettings.noTimeout}
        onNoTimeoutToggle={aiSettings.handleNoTimeoutToggle}
        availableModels={aiSettings.availableModels}
        testResult={aiSettings.testResult}
        serverError={aiSettings.serverError}
        onProviderChange={aiSettings.handleProviderChange}
        onFetchModels={aiSettings.handleFetchModels}
        onTestConnection={aiSettings.handleTestConnection}
        onSave={aiSettings.handleSave}
      />
    </div>
  );
};
