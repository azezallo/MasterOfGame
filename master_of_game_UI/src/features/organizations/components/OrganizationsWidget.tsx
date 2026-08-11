import React from 'react';
import { useTranslation } from 'react-i18next';
import type { OrganizationSummary } from '../types/organization';
import { getReputationLabel, getReputationStatus } from '../types/organization';
import styles from './OrganizationsWidget.module.css';

interface OrganizationsWidgetProps {
  organizations: OrganizationSummary[];
  isLoading?: boolean;
  onOpenDirectory: () => void;
  onSelectOrganization: (id: string) => void;
}

export const OrganizationsWidget: React.FC<OrganizationsWidgetProps> = ({
  organizations,
  isLoading = false,
  onOpenDirectory,
  onSelectOrganization,
}) => {
  const { t } = useTranslation();

  const displayList = organizations.slice(0, 5);

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon}>🏛️</span>
          <h3 className={styles.title}>{t('organizations.widget_title')}</h3>
        </div>
        <button
          type="button"
          className={styles.directoryBtn}
          onClick={onOpenDirectory}
        >
          {t('organizations.directory_button')}
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>{t('organizations.loading')}</span>
          </div>
        ) : displayList.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>{t('organizations.empty_widget')}</p>
          </div>
        ) : (
          <ul className={styles.orgList}>
            {displayList.map((org) => {
              const repStatus = getReputationStatus(org.player_reputation);
              const repLabel = getReputationLabel(org.player_reputation, t);

              return (
                <li key={org.id}>
                  <button
                    type="button"
                    className={styles.orgCard}
                    onClick={() => onSelectOrganization(org.id)}
                  >
                    <div className={styles.avatarBadge}>
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.orgDetails}>
                      <div className={styles.nameRow}>
                        <span className={styles.orgName}>{org.name}</span>
                        {org.player_rank && (
                          <span className={styles.rankBadge}>{org.player_rank}</span>
                        )}
                      </div>
                      <div className={styles.metaRow}>
                        <span className={`${styles.repBadge} ${styles[repStatus]}`}>
                          {repLabel} ({org.player_reputation > 0 ? `+${org.player_reputation}` : org.player_reputation})
                        </span>
                      </div>
                    </div>
                    <span className={styles.chevron}>›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
