import React from 'react';
import { useTranslation } from 'react-i18next';
import type { NpcData } from '../types/npc';
import styles from './ActiveNpcAside.module.css';

interface ActiveNpcWidgetProps {
  activeNpcs: NpcData[];
  isLoading?: boolean;
  onOpenDirectory: () => void;
  onSelectNpc: (npcId: string) => void;
}

export const ActiveNpcWidget: React.FC<ActiveNpcWidgetProps> = ({
  activeNpcs,
  isLoading = false,
  onOpenDirectory,
  onSelectNpc,
}) => {
  const { t } = useTranslation();
  const displayedNpcs = activeNpcs.slice(0, 5);

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon}>👥</span>
          <h2 className={styles.title}>{t('npc.widget_title')}</h2>
        </div>
        <button
          type="button"
          className={styles.directoryBtn}
          onClick={onOpenDirectory}
          title={t('npc.directory_modal_title')}
        >
          {t('npc.directory_button')}
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>{t('npc.loading')}</span>
          </div>
        ) : displayedNpcs.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>{t('npc.empty_scene')}</p>
          </div>
        ) : (
          <ul className={styles.npcList}>
            {displayedNpcs.map((npc) => (
              <li key={npc.npc_id}>
                <button
                  type="button"
                  className={styles.npcCard}
                  onClick={() => onSelectNpc(npc.npc_id)}
                >
                  <div className={styles.avatarBadge}>
                    {npc.public_profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.npcDetails}>
                    <span className={styles.npcName}>{npc.public_profile.name}</span>
                    <span className={styles.npcRole}>{npc.public_profile.role}</span>
                  </div>
                  <span className={styles.chevron}>›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Export alias for backward compatibility
export const ActiveNpcAside = ActiveNpcWidget;
