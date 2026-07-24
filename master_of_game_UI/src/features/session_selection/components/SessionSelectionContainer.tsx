import React, { useState, useEffect } from 'react';
import { useSessions } from '../hooks/useSessions';
import { SessionTable } from '../components/SessionTable';
import { SessionCard } from '../components/SessionCard';
import { GameViewPlaceholder } from '../components/GameViewPlaceholder';
import { Spinner } from '@/components/ui/spinner/Spinner.tsx';
import { CreateSessionButton } from '@/features/session_creation';
import styles from '../styles/SessionSelectionContainer.module.css';

interface SessionSelectionContainerProps {
  onSessionSelect: (sessionId: string) => void;
}

export const SessionSelectionContainer: React.FC<SessionSelectionContainerProps> = ({ onSessionSelect }) => {
  const { sessions, isLoading, error } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Sync with URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('session_id');
    if (id) {
      setSelectedSessionId(id);
    }
  }, []);

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

  return (
    <div className={styles.container}>
      {selectedSessionId ? (
        <GameViewPlaceholder />
      ) : (
        <>
          <div className={styles.header}>
            <h2 className={styles.title}>Вибір сесії</h2>
            <CreateSessionButton onSessionSelected={(id) => setSelectedSessionId(id)} />
          </div>
          <div className={styles.content}>
            {sessions.length === 0 ? (
              <p className={styles.emptyMessage}>Не має активних ігор</p>
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
        </>
      )}
    </div>
  );
};
