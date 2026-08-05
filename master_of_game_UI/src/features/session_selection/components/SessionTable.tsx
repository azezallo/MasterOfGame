import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionMetadata } from '@/api/contracts/sessions';
import { formatDate } from '@/utils/date';
import styles from '../styles/SessionTable.module.css';

interface SessionTableProps {
  sessions: SessionMetadata[];
  onSelect: (sessionId: string) => void;
}

export const SessionTable: React.FC<SessionTableProps> = ({ sessions, onSelect }) => {
  const { t } = useTranslation();

  if (sessions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>{t('session_selection.empty_message')}</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHeader}>{t('session_selection.table.name')}</th>
            <th className={styles.tableHeader}>{t('session_selection.table.created')}</th>
            <th className={styles.tableHeader}>{t('session_selection.table.last_played')}</th>
            <th className={styles.tableHeader}>{t('session_selection.table.hero_name')}</th>
            <th className={styles.tableHeader}><span className="sr-only">{t('session_selection.table.actions')}</span></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.sessionId} className={styles.tableRow}>
              <td className={styles.tableCell}>
                <strong>{session.gameName}</strong>
              </td>
              <td className={styles.tableCell}>
                {formatDate(session.createdAt)}
              </td>
              <td className={styles.tableCell}>
                {session.lastPlayedAt > 0 ? formatDate(session.lastPlayedAt) : t('common.not_played')}
              </td>
              <td className={styles.tableCell}>
                {session.characterName}
              </td>
              <td className={styles.tableCell}>
                <button
                  className={styles.selectButton}
                  onClick={() => onSelect(session.sessionId)}
                >
                  {t('session_selection.actions.select')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
