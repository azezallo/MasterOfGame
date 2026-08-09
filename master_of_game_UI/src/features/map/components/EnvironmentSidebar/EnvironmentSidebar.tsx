import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LocationData } from '../../../../types/location';
import styles from './EnvironmentSidebar.module.css';

interface EnvironmentSidebarProps {
  location: LocationData;
}

export const EnvironmentSidebar: React.FC<EnvironmentSidebarProps> = ({ location }) => {
  const { t } = useTranslation();

  const [openSections, setOpenSections] = useState({
    transitions: true,
    entities: true,
    items: true,
    hazards: true,
  });

  if (!location) return null;

  const { transitions, connected_entities, environmental_state } = location;

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className={styles.sidebar}>
      <h2 className={styles.title}>{t('map.sidebar.title')}</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle} onClick={() => toggleSection('transitions')}>
          <span className={`${styles.chevron} ${openSections.transitions ? styles.open : ''}`}>▼</span>
          {t('map.sidebar.exits')}
        </h3>
        {openSections.transitions && (
          transitions && transitions.length > 0 ? (
            <ul className={styles.list}>
              {transitions.map((transition) => (
                <li key={transition.transition_id} className={styles.listItem}>
                  <span className={styles.direction}>{transition.direction_label}</span>
                  <span className={`${styles.status} ${styles[transition.access_status as keyof typeof styles]}`}>
                    {transition.access_status === 'open' && t('map.status.open')}
                    {transition.access_status === 'locked' && t('map.status.locked')}
                    {transition.access_status === 'blocked' && t('map.status.blocked')}
                    {transition.access_status === 'conditional' && t('map.status.conditional')}
                    {transition.discovery_status === 'discovered' && t('map.status.secret')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyText}>{t('map.sidebar.no_exits')}</p>
          )
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle} onClick={() => toggleSection('entities')}>
          <span className={`${styles.chevron} ${openSections.entities ? styles.open : ''}`}>▼</span>
          {t('map.sidebar.entities')}
        </h3>
        {openSections.entities && (
          connected_entities?.associated_npc_ids?.length > 0 ? (
            <ul className={styles.list}>
              {connected_entities.associated_npc_ids.map((npcId, idx) => (
                <li key={idx} className={styles.listItem}>
                  {/* Normally we'd map this ID to a real name via store */}
                  {npcId}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyText}>{t('map.sidebar.no_entities')}</p>
          )
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle} onClick={() => toggleSection('items')}>
          <span className={`${styles.chevron} ${openSections.items ? styles.open : ''}`}>▼</span>
          {t('map.sidebar.items')}
        </h3>
        {openSections.items && (
          connected_entities?.present_item_ids?.length > 0 ? (
            <ul className={styles.list}>
              {connected_entities.present_item_ids.map((itemId, idx) => (
                <li key={idx} className={styles.listItem}>
                  {/* Normally we'd map this ID to a real name via store */}
                  {itemId}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyText}>{t('map.sidebar.no_items')}</p>
          )
        )}
      </section>

      {environmental_state?.active_hazards?.length > 0 && (
        <section className={`${styles.section} ${styles.hazardSection}`}>
          <h3 className={styles.sectionTitle} onClick={() => toggleSection('hazards')}>
            <span className={`${styles.chevron} ${openSections.hazards ? styles.open : ''}`}>▼</span>
            {t('map.sidebar.hazards')}
          </h3>
          {openSections.hazards && (
            <ul className={styles.list}>
              {environmental_state.active_hazards.map((hazard, idx) => (
                <li key={idx} className={styles.hazardItem}>{hazard}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
