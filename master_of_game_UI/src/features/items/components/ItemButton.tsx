import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Item } from '../types/item';
import styles from './ItemButton.module.css';

interface ItemButtonProps {
  item: Item;
  onClick: (item: Item) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  jewelry: '💍',
  consumable: '🧪',
  key: '🔑',
  container: '📦',
  document: '📜',
  artifact: '✨',
  misc: '🎒',
};

export const ItemButton: React.FC<ItemButtonProps> = ({ item, onClick }) => {
  const { t } = useTranslation();
  const durabilityState = item.physical_properties.durability?.state || 'intact';
  const icon = CATEGORY_ICONS[item.category] || '🎒';
  const label = t(`items.durability.${durabilityState}`);

  const durabilityClass =
    durabilityState === 'intact'
      ? styles.durabilityIntact
      : durabilityState === 'worn'
        ? styles.durabilityWorn
        : durabilityState === 'damaged'
          ? styles.durabilityDamaged
          : styles.durabilityBroken;

  const badgeClass =
    durabilityState === 'intact'
      ? styles.badgeIntact
      : durabilityState === 'worn'
        ? styles.badgeWorn
        : durabilityState === 'damaged'
          ? styles.badgeDamaged
          : styles.badgeBroken;

  return (
    <button
      type="button"
      className={`${styles.itemButton} ${durabilityClass}`}
      onClick={() => onClick(item)}
      title={`${item.public_profile.name} (${label})`}
    >
      <div className={styles.itemInfo}>
        <span className={styles.itemIcon}>{icon}</span>
        <span className={styles.itemName}>{item.public_profile.name}</span>
      </div>
      <span className={`${styles.badge} ${badgeClass}`}>{label}</span>
    </button>
  );
};
