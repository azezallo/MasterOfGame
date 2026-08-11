import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyProfile, StorageCache } from '../types/property';
import styles from './RealEstateStorageTab.module.css';

interface RealEstateStorageTabProps {
  property: PropertyProfile;
  onOpenChest: (cache: StorageCache) => void;
}

export const RealEstateStorageTab: React.FC<RealEstateStorageTabProps> = ({
  property,
  onOpenChest,
}) => {
  const { t } = useTranslation();
  const { real_estate, storage_caches, vehicles_and_mounts } = property;

  const [openSections, setOpenSections] = useState({
    realEstate: true,
    caches: true,
    vehicles: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className={styles.container}>
      {/* Real Estate Accordion */}
      <div className={styles.accordionHeader} onClick={() => toggleSection('realEstate')}>
        <span className={`${styles.chevron} ${openSections.realEstate ? styles.open : ''}`}>
          ▼
        </span>
        <span>{t('property.real_estate.title')}</span>
      </div>

      {openSections.realEstate && (
        <div className={styles.sectionBody}>
          {real_estate.length === 0 ? (
            <div className={styles.emptyCard}>{t('property.real_estate.no_properties')}</div>
          ) : (
            <div className={styles.listGroup}>
              {real_estate.map(re => {
                const isRented = re.ownership_type === 'rented';
                return (
                  <div key={re.property_id} className={styles.propertyCard}>
                    <div className={styles.propHeader}>
                      <span className={styles.propName}>{re.name}</span>
                      <span
                        className={`${styles.typeBadge} ${
                          isRented ? styles.rentedBadge : styles.ownedBadge
                        }`}
                      >
                        {isRented
                          ? t('property.real_estate.rented')
                          : t('property.real_estate.owned')}
                      </span>
                    </div>

                    {re.rent_details && (
                      <div className={styles.rentInfoRow}>
                        <span>
                          ⏳{' '}
                          {t('property.real_estate.rent_paid_until', {
                            day: re.rent_details.paid_until_day,
                            cost: re.rent_details.cost_per_day_coins,
                          })}
                        </span>
                      </div>
                    )}

                    {re.business_and_tax_details && (
                      <div className={styles.businessRow}>
                        <span>💼 {t('property.real_estate.business_profit')}</span>
                        <span className={styles.profitVal}>
                          🪙 {re.business_and_tax_details.accumulated_profit_coins.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Storage Caches Accordion */}
      <div className={styles.accordionHeader} onClick={() => toggleSection('caches')}>
        <span className={`${styles.chevron} ${openSections.caches ? styles.open : ''}`}>▼</span>
        <span>{t('property.real_estate.caches_title')}</span>
      </div>

      {openSections.caches && (
        <div className={styles.sectionBody}>
          {storage_caches.length === 0 ? (
            <div className={styles.emptyCard}>{t('property.real_estate.no_caches')}</div>
          ) : (
            <div className={styles.listGroup}>
              {storage_caches.map(cache => {
                const itemCount = cache.items?.length || 0;
                return (
                  <div key={cache.cache_id} className={styles.cacheCard}>
                    <div className={styles.cacheHeader}>
                      <div>
                        <div className={styles.cacheName}>🔒 {cache.name}</div>
                        <div className={styles.cacheLocation}>Локація: {cache.location_id}</div>
                      </div>
                      <button
                        type="button"
                        className={styles.openChestBtn}
                        onClick={() => onOpenChest(cache)}
                      >
                        📦 {t('property.real_estate.open_chest', { count: itemCount })}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vehicles & Mounts Accordion */}
      <div className={styles.accordionHeader} onClick={() => toggleSection('vehicles')}>
        <span className={`${styles.chevron} ${openSections.vehicles ? styles.open : ''}`}>▼</span>
        <span>{t('property.real_estate.vehicles_title')}</span>
      </div>

      {openSections.vehicles && (
        <div className={styles.sectionBody}>
          {vehicles_and_mounts.length === 0 ? (
            <div className={styles.emptyCard}>{t('property.real_estate.no_vehicles')}</div>
          ) : (
            <div className={styles.listGroup}>
              {vehicles_and_mounts.map(v => (
                <div key={v.vehicle_id} className={styles.vehicleCard}>
                  <div className={styles.vehHeader}>
                    <span className={styles.vehName}>
                      {v.type === 'mount' ? '🐴' : '🛒'} {v.name}
                    </span>
                    <span className={`${styles.statusBadge} ${styles[v.status]}`}>
                      {t(`property.real_estate.status.${v.status}`)}
                    </span>
                  </div>
                  <div className={styles.vehSub}>Локація: {v.current_location_id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
