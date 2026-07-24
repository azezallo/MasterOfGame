import type { SessionMetadata } from '@/api/contracts/sessions';
import styles from '../styles/SessionTable.module.css';
import { formatDate } from '@/utils/date.ts';

interface SessionTableProps {
  sessions: SessionMetadata[];
  onSelect: (sessionId: string) => void;
}

export const SessionTable: React.FC<SessionTableProps> = ({ sessions, onSelect }) => {
  if (sessions.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <p>Не має активних ігор</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHeader}>Назва</th>
            <th className={styles.tableHeader}>Створено</th>
            <th className={styles.tableHeader}>Остання гра</th>
            <th className={styles.tableHeader}>Ім'я героя</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.sessionId} className={styles.tableRow} onClick={() => onSelect(session.sessionId)}>
              <td className={styles.tableCell}>{session.gameName}</td>
              <td className={styles.tableCell}>{formatDate(session.createdAt)}</td>
              <td className={styles.tableCell}>
                <span className={styles.lastUpdate}>
                  {session.lastPlayedAt > 0 ? formatDate(session.lastPlayedAt) : 'Не гралося'}
                </span>
              </td>
              <td className={styles.tableCell}>{session.characterName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
