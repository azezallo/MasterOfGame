import React from 'react';
import { useTranslation } from 'react-i18next';
import { useItems } from '../hooks/useItems';
import type { ItemCategory } from '../types/item';
import { ItemButton } from './ItemButton';
import { ItemDossierModal } from './ItemDossierModal';
import styles from './ItemsWidget.module.css';

interface ItemsWidgetProps {
  sessionId: string;
  ownerType?: 'location' | 'npc' | 'player' | 'container';
  ownerId?: string;
  title?: string;
}

export const ItemsWidget: React.FC<ItemsWidgetProps> = ({
  sessionId,
  ownerType = 'player',
  ownerId = 'player_1',
  title,
}) => {
  const { t } = useTranslation();
  const {
    items,
    allItems,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedItem,
    isDossierOpen,
    openDossier,
    closeDossier,
    categoriesCount,
  } = useItems({ sessionId, ownerType, ownerId });

  const widgetTitle = title || t('items.title');

  const categories: (ItemCategory | 'all')[] = [
    'all',
    'weapon',
    'armor',
    'jewelry',
    'consumable',
    'key',
    'container',
    'document',
    'artifact',
    'misc',
  ];

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{widgetTitle}</h3>
          <span className={styles.totalCount}>
            {t('items.total_count', { count: allItems.length })}
          </span>
        </div>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={t('items.search_placeholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.categoryTabs}>
        {categories.map(cat => {
          const count = categoriesCount[cat] || 0;
          if (cat !== 'all' && count === 0) return null;

          return (
            <button
              key={cat}
              type="button"
              className={`${styles.categoryTab} ${selectedCategory === cat ? styles.activeTab : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {t(`items.categories.${cat}`)} ({count})
            </button>
          );
        })}
      </div>

      <div className={styles.itemsList}>
        {loading ? (
          <div className={styles.emptyState}>{t('items.loading')}</div>
        ) : error ? (
          <div className={styles.emptyState}>{error}</div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>{t('items.empty')}</div>
        ) : (
          items.map(item => (
            <ItemButton key={item.item_id} item={item} onClick={openDossier} />
          ))
        )}
      </div>

      <ItemDossierModal item={selectedItem} isOpen={isDossierOpen} onClose={closeDossier} />
    </div>
  );
};
