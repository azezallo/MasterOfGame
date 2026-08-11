import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { NpcData, NpcLifecycleStatus } from '../types/npc';
import styles from './GlobalNpcDirectoryModal.module.css';

interface GlobalNpcDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  npcs: NpcData[];
  isLoading?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: NpcLifecycleStatus | 'all';
  onStatusFilterChange: (status: NpcLifecycleStatus | 'all') => void;
  onSelectNpc: (npcId: string) => void;
}

const STATUS_CLASS_MAP: Record<NpcLifecycleStatus, string> = {
  alive: 'alive',
  dead: 'dead',
  coma: 'coma',
  missing: 'missing',
  captured: 'captured',
  archived: 'archived',
};

const STATUS_OPTIONS: Array<{ value: NpcLifecycleStatus | 'all' }> = [
  { value: 'all' },
  { value: 'alive' },
  { value: 'dead' },
  { value: 'coma' },
  { value: 'missing' },
  { value: 'captured' },
  { value: 'archived' },
];

export const GlobalNpcDirectoryModal: React.FC<GlobalNpcDirectoryModalProps> = ({
  isOpen,
  onClose,
  npcs,
  isLoading = false,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSelectNpc,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.icon}>📖</span>
            <h2 className={styles.title}>{t('npc.directory_modal_title')}</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} title={t('npc.close')}>
            ✕
          </button>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('npc.search_placeholder')}
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

          <div className={styles.filterWrapper}>
            <label htmlFor="npc-status-filter" className={styles.filterLabel}>
              {t('npc.status_label')}
            </label>
            <select
              id="npc-status-filter"
              className={styles.statusSelect}
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(e.target.value as NpcLifecycleStatus | 'all')
              }
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value === 'all'
                    ? t('npc.all_statuses')
                    : t(`npc.status_plural.${opt.value}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <span>{t('npc.loading_directory')}</span>
            </div>
          ) : npcs.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t('npc.empty_directory')}</p>
            </div>
          ) : (
            <div className={styles.directoryGrid}>
              {npcs.map((npc) => {
                const classKey = STATUS_CLASS_MAP[npc.status] || 'alive';
                const statusLabel = t(`npc.statuses.${npc.status}`, { defaultValue: npc.status });

                return (
                  <button
                    key={npc.npc_id}
                    type="button"
                    className={styles.directoryCard}
                    onClick={() => {
                      onSelectNpc(npc.npc_id);
                    }}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.cardName}>{npc.public_profile.name}</span>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[classKey]
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <p className={styles.cardRole}>{npc.public_profile.role}</p>

                    {npc.public_profile.public_description && (
                      <p className={styles.cardDesc}>
                        {npc.public_profile.public_description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.counterText}>
            {t('npc.total_count', { count: npcs.length })}
          </span>
          <button type="button" className={styles.closeModalBtn} onClick={onClose}>
            {t('npc.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
