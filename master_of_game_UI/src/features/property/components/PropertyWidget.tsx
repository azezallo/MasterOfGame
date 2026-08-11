import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProperty } from '../hooks/useProperty';
import type { PropertyTab } from '../types/property';
import { EquipmentBagTab } from './EquipmentBagTab';
import { FinancesDebtsTab } from './FinancesDebtsTab';
import { RealEstateStorageTab } from './RealEstateStorageTab';
import { ChestTransferModal } from './ChestTransferModal';
import { ItemDossierModal } from '../../items/components/ItemDossierModal';
import styles from './PropertyWidget.module.css';

interface PropertyWidgetProps {
  sessionId: string;
  ownerType?: 'player' | 'npc' | 'organization';
  ownerId?: string;
  title?: string;
}

export const PropertyWidget: React.FC<PropertyWidgetProps> = ({
  sessionId,
  ownerType = 'player',
  ownerId = 'player_1',
}) => {
  const { t } = useTranslation();
  const [isWidgetExpanded, setIsWidgetExpanded] = useState<boolean>(true);

  const {
    activeTab,
    setActiveTab,
    property,
    loading,
    error,
    selectedItem,
    isDossierOpen,
    openDossier,
    closeDossier,
    activeChestModal,
    isChestModalOpen,
    openChestModal,
    closeChestModal,
  } = useProperty({ sessionId, ownerType, ownerId });

  const tabs: { id: PropertyTab; labelKey: string; icon: string }[] = [
    { id: 'equipment', labelKey: 'property.tabs.equipment', icon: '🛡️' },
    { id: 'finances', labelKey: 'property.tabs.finances', icon: '🪙' },
    { id: 'real_estate', labelKey: 'property.tabs.real_estate', icon: '🏠' },
  ];

  const weightStatus = property?.pocket_inventory.weight_stats.encumbrance_status || 'normal';

  return (
    <div className={styles.widgetContainer}>
      {/* Collapsible Header Bar */}
      <div className={styles.header}>
        <div
          className={styles.titleRow}
          onClick={() => setIsWidgetExpanded(prev => !prev)}
          role="button"
          tabIndex={0}
        >
          <div className={styles.titleLeft}>
            <span className={`${styles.chevron} ${isWidgetExpanded ? styles.expanded : ''}`}>
              ▼
            </span>
            <h3 className={styles.title}>{t('property.title')}</h3>
          </div>

          {property && (
            <div className={styles.headerBadge}>
              <span className={styles.coinsBadge}>🪙 {property.finances.coins.toLocaleString()}</span>
              <span
                className={`${styles.encumbranceMiniBadge} ${styles[weightStatus]}`}
                title={t(`property.weight.status.${weightStatus}`)}
              >
                ⚖️ {property.pocket_inventory.weight_stats.total_weight_kg.toFixed(1)}kg
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation (Visible when widget is expanded) */}
        {isWidgetExpanded && (
          <div className={styles.tabsNav}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                <span className={styles.tabLabel}>{t(tab.labelKey)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Body */}
      {isWidgetExpanded && (
        <div className={styles.contentBody}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <span>{t('property.loading')}</span>
            </div>
          ) : error ? (
            <div className={styles.errorState}>{error}</div>
          ) : !property ? (
            <div className={styles.emptyState}>{t('property.empty')}</div>
          ) : (
            <>
              {activeTab === 'equipment' && (
                <EquipmentBagTab property={property} onItemClick={openDossier} />
              )}
              {activeTab === 'finances' && <FinancesDebtsTab property={property} />}
              {activeTab === 'real_estate' && (
                <RealEstateStorageTab property={property} onOpenChest={openChestModal} />
              )}
            </>
          )}
        </div>
      )}

      {/* Item Dossier Modal */}
      <ItemDossierModal item={selectedItem} isOpen={isDossierOpen} onClose={closeDossier} />

      {/* Storage Chest Modal */}
      {activeChestModal && (
        <ChestTransferModal
          cache={activeChestModal}
          isOpen={isChestModalOpen}
          onClose={closeChestModal}
          onItemClick={openDossier}
        />
      )}
    </div>
  );
};
