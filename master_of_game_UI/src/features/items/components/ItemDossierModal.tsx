import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Item } from '../types/item';
import styles from './ItemDossierModal.module.css';

interface ItemDossierModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ItemDossierModal: React.FC<ItemDossierModalProps> = ({ item, isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen || !item) return null;

  const displayName = item.private_profile?.true_name || item.public_profile.name;
  const secrets = item.private_profile?.hidden_secrets || [];
  const enchantments = item.private_profile?.magical_properties?.active_enchantments || [];
  const docProps = item.special_mechanics?.document_properties;

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>{displayName}</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {/* Appearance */}
          {item.public_profile.appearance && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>{t('items.dossier.appearance')}</span>
              <div className={styles.appearanceText}>{item.public_profile.appearance}</div>
            </div>
          )}

          {/* Description */}
          {item.public_profile.public_description && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>{t('items.dossier.description')}</span>
              <div className={styles.descriptionText}>{item.public_profile.public_description}</div>
            </div>
          )}

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>{t('items.dossier.weight')}</span>
              <span className={styles.statValue}>
                {t('items.dossier.weight_unit', { weight: item.physical_properties.weight_kg })}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>{t('items.dossier.durability')}</span>
              <span className={styles.statValue}>
                {item.physical_properties.durability.current} / {item.physical_properties.durability.max}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>{t('items.dossier.value')}</span>
              <span className={styles.statValue}>
                {t('items.dossier.value_unit', { value: item.physical_properties.base_value_gold })}
              </span>
            </div>
          </div>

          {/* Discovered Secrets */}
          {secrets.length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>{t('items.dossier.discovered_secrets')}</span>
              {secrets.map(s => (
                <div key={s.secret_id} className={styles.secretItem}>
                  <strong>{s.secret_type}:</strong> {s.description}
                </div>
              ))}
            </div>
          )}

          {/* Active Enchantments */}
          {enchantments.length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>{t('items.dossier.magical_effects')}</span>
              {enchantments.map(e => (
                <div key={e.enchantment_id} className={styles.enchantmentItem}>
                  <strong>{e.name}:</strong> {e.effect_description}
                  {e.charges && ` (${t('items.dossier.charges', { current: e.charges.current, max: e.charges.max })})`}
                </div>
              ))}
            </div>
          )}

          {/* Document Content */}
          {docProps && docProps.text_content && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>
                {t('items.dossier.document_content', { language: docProps.language })}
              </span>
              <div className={styles.documentBox}>{docProps.text_content}</div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.closeModalBtn} onClick={onClose}>
            {t('items.dossier.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
