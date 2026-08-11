import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { StorageCache } from '../types/property';
import type { Item } from '../../items/types/item';
import { ItemButton } from '../../items/components/ItemButton';
import styles from './ChestTransferModal.module.css';

interface ChestTransferModalProps {
  cache: StorageCache;
  isOpen: boolean;
  onClose: () => void;
  onItemClick?: (item: Item) => void;
}

export const ChestTransferModal: React.FC<ChestTransferModalProps> = ({
  cache,
  isOpen,
  onClose,
  onItemClick,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const chestItems = cache.items || [];

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            📦 {t('property.chest.title', { name: cache.name })}
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.panelTitle}>{t('property.chest.chest_title')}</div>

          <div className={styles.itemList}>
            {chestItems.length === 0 ? (
              <div className={styles.emptyText}>{t('property.chest.empty_chest')}</div>
            ) : (
              chestItems.map(item => {
                if (!item.resolved_item) return null;
                return (
                  <div key={item.item_id} className={styles.itemRow}>
                    <ItemButton
                      item={item.resolved_item}
                      onClick={clickedItem => {
                        if (onItemClick) onItemClick(clickedItem);
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.narrativeHint}>{t('property.chest.inspect_hint')}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};
