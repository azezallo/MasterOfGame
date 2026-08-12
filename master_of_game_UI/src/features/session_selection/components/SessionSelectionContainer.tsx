import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessions } from '../hooks/useSessions';
import { SessionTable } from '../components/SessionTable';
import { SessionCard } from '../components/SessionCard';
import { ChatLayout } from '@/features/chat';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { CreateSessionButton } from '@/features/session_creation';
import { useAISettings, AISettingsModal } from '@/features/ai_settings';
import type { GetMeResponse } from '@/api/contracts/auth';
import styles from '../styles/SessionSelectionContainer.module.css';

interface SessionSelectionContainerProps {
  onSessionSelect: (sessionId: string) => void;
  user?: GetMeResponse | null;
}

export const SessionSelectionContainer: React.FC<SessionSelectionContainerProps> = ({
  onSessionSelect,
  user,
}) => {
  const { t } = useTranslation();
  const { sessions, isLoading, error, refetch } = useSessions(user);
  const aiSettings = useAISettings();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('session_id');
  });

  // Effect to update URL when selectedSessionId changes
  useEffect(() => {
    if (selectedSessionId !== null) {
      const params = new URLSearchParams(window.location.search);
      params.set('session_id', selectedSessionId);
      window.history.replaceState({}, '', `?${params.toString()}`);
    }
  }, [selectedSessionId]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>
          {error}
        </div>
        <button
          type="button"
          onClick={refetch}
          style={{
            marginTop: '1rem',
            padding: '8px 16px',
            backgroundColor: '#d4af37',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {t('common.retry', 'Спробувати ще раз')}
        </button>
      </div>
    );
  }

  if (selectedSessionId) {
    return <ChatLayout sessionId={selectedSessionId} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('session_selection.title')}</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={aiSettings.openModal}
            style={{
              padding: '8px 14px',
              backgroundColor: '#1a1d24',
              color: '#4a90e2',
              border: '1px solid #4a90e2',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            ⚙️ {t('ai_settings.title', 'Налаштування ШІ')}
          </button>
          <CreateSessionButton onSessionSelected={(id) => setSelectedSessionId(id)} />
        </div>
      </div>
      <div className={styles.content}>
        {sessions.length === 0 ? (
          <p className={styles.emptyMessage}>{t('session_selection.empty_message')}</p>
        ) : (
          <div className={styles.responsiveWrapper}>
            <div className={styles.tableContainer}>
              <SessionTable sessions={sessions} onSelect={(id) => {
                setSelectedSessionId(id);
                onSessionSelect(id);
              }} />
            </div>
            <div className={styles.cardContainer}>
              {sessions.map((session) => (
                <SessionCard key={session.sessionId} session={session} onSelect={(id) => {
                  setSelectedSessionId(id);
                  onSessionSelect(id);
                }} />
              ))}
            </div>
          </div>
        )}
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
