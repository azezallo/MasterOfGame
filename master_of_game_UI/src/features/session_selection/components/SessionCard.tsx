import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/SessionCard.module.css';
import type { SessionMetadata } from '@/api/contracts/sessions';
import { formatDate } from '@/utils/date';

interface SessionCardProps {
  session: SessionMetadata;
  onSelect: (sessionId: string) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onSelect }) => {
  const { t } = useTranslation();
  const lastPlayed = session.lastPlayedAt > 0 ? formatDate(session.lastPlayedAt) : t('common.not_played');

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
        {t('session_selection.card.created')}{formatDate(session.createdAt)}
      </div>
      <div className={styles.cardInfo}>
        {t('session_selection.card.hero')}{session.characterName}
      </div>
      <div className={styles.statusBadge}>
        {t('session_selection.card.last_update')}{lastPlayed}
      </div>
    </div>
  );
};
