import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyProfile, EquipmentLayer } from '../types/property';
import type { Item } from '../../items/types/item';
import { ItemButton } from '../../items/components/ItemButton';
import styles from './EquipmentBagTab.module.css';

interface EquipmentBagTabProps {
  property: PropertyProfile;
  onItemClick: (item: Item) => void;
}

const LAYER_ICONS: Record<EquipmentLayer, string> = {
  inner: '👕',
  middle: '🛡️',
  outer: '🧥',
  accessory: '💍',
};

export const EquipmentBagTab: React.FC<EquipmentBagTabProps> = ({
  property,
  onItemClick,
}) => {
  const { t } = useTranslation();
  const { pocket_inventory, equipped } = property;
  const { weight_stats, backpack, pockets_and_belt } = pocket_inventory;

  const [openSections, setOpenSections] = useState({
    equipped: true,
    pockets: true,
    backpack: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const totalWeight = weight_stats?.total_weight_kg ?? 0;
  const maxWeight = weight_stats?.max_carry_weight_kg ?? 30.0;
  const weightPercent = Math.min(
    100,
    (totalWeight / (maxWeight || 1)) * 100
  );

  const layersOrder: EquipmentLayer[] = ['inner', 'middle', 'outer', 'accessory'];

  return (
    <div className={styles.container}>
      {/* Weight & Encumbrance Bar */}
      <div className={styles.weightCard}>
        <div className={styles.weightHeader}>
          <span className={styles.weightLabel}>
            ⚖️{' '}
            {t('property.weight.label', {
              current: totalWeight.toFixed(1),
              max: maxWeight.toFixed(1),
            })}
          </span>
          <span className={`${styles.statusBadge} ${styles[weight_stats.encumbrance_status]}`}>
            {t(`property.weight.status.${weight_stats.encumbrance_status}`).toUpperCase()}
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressBar} ${styles[weight_stats.encumbrance_status]}`}
            style={{ width: `${weightPercent}%` }}
          />
        </div>

        <div className={styles.weightSubText}>
          <span>
            {t('property.weight.body_pockets', {
              weight: weight_stats.equipped_and_pockets_weight_kg.toFixed(1),
            })}
          </span>
          <span>
            {t('property.weight.backpack', {
              weight: weight_stats.backpack_weight_kg.toFixed(1),
            })}
          </span>
        </div>
      </div>

      {/* Layered Equipment Accordion */}
      <div className={styles.accordionHeader} onClick={() => toggleSection('equipped')}>
        <span className={`${styles.chevron} ${openSections.equipped ? styles.open : ''}`}>▼</span>
        <span>{t('property.equipment.layered_title')}</span>
      </div>

      {openSections.equipped && (
        <div className={styles.sectionBody}>
          {equipped.length === 0 ? (
            <div className={styles.emptyCard}>{t('property.equipment.empty_layered')}</div>
          ) : (
            layersOrder.map(layerKey => {
              const layerItems = equipped.filter(eq => eq.layer === layerKey);
              if (layerItems.length === 0) return null;

              return (
                <div key={layerKey} className={styles.layerGroup}>
                  <div className={styles.layerHeader}>
                    <span>{LAYER_ICONS[layerKey]}</span>
                    <span>{t(`property.equipment.layers.${layerKey}`)}</span>
                  </div>

                  <div className={styles.equippedList}>
                    {layerItems.map(eq => {
                      const item = eq.resolved_item;
                      const durState = item?.physical_properties.durability?.state || 'intact';
                      const isBlocked = eq.interaction_state.is_blocked;

                      return (
                        <div
                          key={eq.equipped_instance_id}
                          className={`${styles.equippedCard} ${isBlocked ? styles.blockedCard : ''}`}
                          onClick={() => item && onItemClick(item)}
                        >
                          <div className={styles.cardTop}>
                            <span className={styles.zoneBadge}>
                              [{t(`property.equipment.zones.${eq.body_zone}`, { defaultValue: eq.body_zone })}]
                            </span>
                            <span className={`${styles.durBadge} ${styles[durState]}`}>
                              {t(`items.durability.${durState}`, { defaultValue: durState })}
                            </span>
                          </div>

                          <div className={styles.cardName}>{item?.public_profile.name || eq.item_id}</div>

                          {eq.interaction_state.narrative_note && (
                            <div className={styles.noteText}>💡 {eq.interaction_state.narrative_note}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pockets & Belt Accordion */}
      <div className={styles.accordionHeader} onClick={() => toggleSection('pockets')}>
        <span className={`${styles.chevron} ${openSections.pockets ? styles.open : ''}`}>▼</span>
        <span>{t('property.equipment.pockets_title')}</span>
      </div>

      {openSections.pockets && (
        <div className={styles.sectionBody}>
          {pockets_and_belt.items.length === 0 ? (
            <div className={styles.emptyCard}>{t('property.equipment.empty_pockets')}</div>
          ) : (
            <div className={styles.itemsGrid}>
              {pockets_and_belt.items.map(pItem => {
                if (!pItem.resolved_item) return null;
                return (
                  <div key={pItem.item_id} className={styles.itemWrapper}>
                    <ItemButton item={pItem.resolved_item} onClick={onItemClick} />
                    {pItem.custom_label && (
                      <span className={styles.customLabel}>{pItem.custom_label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Backpack Accordion (Read-Only Narrative Status, No Action Buttons) */}
      <div className={styles.accordionHeader} onClick={() => toggleSection('backpack')}>
        <span className={`${styles.chevron} ${openSections.backpack ? styles.open : ''}`}>▼</span>
        <span>
          🎒 {t('property.equipment.backpack_title')}{' '}
          {backpack.is_equipped
            ? t('property.equipment.backpack_equipped')
            : t('property.equipment.backpack_dropped')}
        </span>
      </div>

      {openSections.backpack && (
        <div className={`${styles.sectionBody} ${!backpack.is_equipped ? styles.droppedGrid : ''}`}>
          {backpack.items.length === 0 ? (
            <div className={styles.emptyCard}>{t('property.equipment.empty_backpack')}</div>
          ) : (
            <div className={styles.itemsGrid}>
              {backpack.items.map(bItem => {
                if (!bItem.resolved_item) return null;
                return (
                  <div key={bItem.item_id} className={styles.itemWrapper}>
                    <ItemButton item={bItem.resolved_item} onClick={onItemClick} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
