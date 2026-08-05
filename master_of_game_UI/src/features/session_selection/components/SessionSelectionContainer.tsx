import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessions } from '../hooks/useSessions';
import { SessionTable } from '../components/SessionTable';
import { SessionCard } from '../components/SessionCard';
import { ChatLayout } from '@/features/chat';
import { Spinner } from '@/components/ui/spinner/Spinner.tsx';
import { CreateSessionButton } from '@/features/session_creation';
import styles from '../styles/SessionSelectionContainer.module.css';

interface SessionSelectionContainerProps {
  onSessionSelect: (sessionId: string) => void;
}

export const SessionSelectionContainer: React.FC<SessionSelectionContainerProps> = ({ onSessionSelect }) => {
  const { t } = useTranslation();
  const { sessions, isLoading, error } = useSessions();
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
        <CreateSessionButton onSessionSelected={(id) => setSelectedSessionId(id)} />
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
    </div>
  );
};
