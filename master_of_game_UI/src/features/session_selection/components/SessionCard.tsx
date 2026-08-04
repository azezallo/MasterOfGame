import React from 'react';
import styles from '../styles/SessionCard.module.css';
import type { SessionMetadata } from '@/api/contracts/sessions';
import { formatDate } from '@/utils/date';

interface SessionCardProps {
  session: SessionMetadata;
  onSelect: (sessionId: string) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onSelect }) => {
  const lastPlayed = session.lastPlayedAt > 0 ? formatDate(session.lastPlayedAt) : 'Не гралося';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(session.sessionId);
    }
  };

  return (
    <div
      className={`${styles.cardContainer} ${styles.clickable}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(session.sessionId)}
      onKeyDown={handleKeyDown}
    >
      <h3 className={styles.cardTitle}>{session.gameName}</h3>
      <div className={styles.cardInfo}>
        Створено: {formatDate(session.createdAt)}
      </div>
      <div className={styles.cardInfo}>
        Герой: {session.characterName}
      </div>
      <div className={styles.statusBadge}>
        Останнє оновлення: {lastPlayed}
      </div>
    </div>
  );
};
