import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { OrganizationSummary, OrganizationTab } from '../types/organization';
import { getReputationLabel, getReputationStatus } from '../types/organization';
import styles from './GlobalOrganizationDirectoryModal.module.css';

interface GlobalOrganizationDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: OrganizationSummary[];
  isLoading?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  tabFilter: OrganizationTab;
  onTabFilterChange: (tab: OrganizationTab) => void;
  onSelectOrganization: (id: string) => void;
}

const TABS: OrganizationTab[] = ['all', 'joined', 'friendly', 'hostile'];

export const GlobalOrganizationDirectoryModal: React.FC<GlobalOrganizationDirectoryModalProps> = ({
  isOpen,
  onClose,
  organizations,
  isLoading = false,
  searchQuery,
  onSearchChange,
  tabFilter,
  onTabFilterChange,
  onSelectOrganization,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.icon}>🏛️</span>
            <h2 className={styles.title}>{t('organizations.directory_modal_title')}</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            title={t('organizations.close')}
          >
            ✕
          </button>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('organizations.search_placeholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => onSearchChange('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.tabsWrapper}>
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.tabBtn} ${tabFilter === tab ? styles.activeTab : ''}`}
                onClick={() => onTabFilterChange(tab)}
              >
                {t(`organizations.tabs.${tab}`)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <span>{t('organizations.loading_directory')}</span>
            </div>
          ) : organizations.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t('organizations.empty_directory')}</p>
            </div>
          ) : (
            <div className={styles.directoryGrid}>
              {organizations.map((org) => {
                const repStatus = getReputationStatus(org.player_reputation);
                const repLabel = getReputationLabel(org.player_reputation, t);
                const typeText = t(`organizations.types.${org.type}`, { defaultValue: org.type });

                return (
                  <button
                    key={org.id}
                    type="button"
                    className={styles.directoryCard}
                    onClick={() => onSelectOrganization(org.id)}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitleGroup}>
                        <span className={styles.cardName}>{org.name}</span>
                        <span className={styles.typeBadge}>{typeText}</span>
                        {org.is_secret && (
                          <span className={styles.secretBadge} title={t('organizations.dossier.status_secret')}>
                            🕵️
                          </span>
                        )}
                      </div>
                      <span className={`${styles.repBadge} ${styles[repStatus]}`}>
                        {repLabel} ({org.player_reputation > 0 ? `+${org.player_reputation}` : org.player_reputation})
                      </span>
                    </div>

                    {org.player_rank && (
                      <div className={styles.rankRow}>
                        <span className={styles.rankLabel}>{t('organizations.dossier.player_rank')}</span>
                        <span className={styles.rankValue}>{org.player_rank}</span>
                      </div>
                    )}

                    {org.description && (
                      <p className={styles.cardDesc}>{org.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.counterText}>
            {t('organizations.total_count', { count: organizations.length })}
          </span>
          <button type="button" className={styles.closeModalBtn} onClick={onClose}>
            {t('organizations.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
