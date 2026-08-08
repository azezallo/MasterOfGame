import React, { useState } from 'react';
import type { LocationData } from '../../../../types/location';
import styles from './EnvironmentSidebar.module.css';

interface EnvironmentSidebarProps {
  location: LocationData;
}

export const EnvironmentSidebar: React.FC<EnvironmentSidebarProps> = ({ location }) => {
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
      <h2 className={styles.title}>Оточення</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle} onClick={() => toggleSection('transitions')}>
          <span className={`${styles.chevron} ${openSections.transitions ? styles.open : ''}`}>▼</span>
          🗺️ Виходи
        </h3>
        {openSections.transitions && (
          transitions && transitions.length > 0 ? (
            <ul className={styles.list}>
              {transitions.map((transition) => (
                <li key={transition.transition_id} className={styles.listItem}>
                  <span className={styles.direction}>{transition.direction_label}</span>
                  <span className={`${styles.status} ${styles[transition.access_status as keyof typeof styles]}`}>
                    {transition.access_status === 'open' && 'Відкрито'}
                    {transition.access_status === 'locked' && 'Замкнено'}
                    {transition.access_status === 'blocked' && 'Заблоковано'}
                    {transition.access_status === 'conditional' && 'Умовно'}
                    {transition.discovery_status === 'discovered' && ' ⚡ [Секрет]'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyText}>Немає видимих виходів.</p>
          )
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle} onClick={() => toggleSection('entities')}>
          <span className={`${styles.chevron} ${openSections.entities ? styles.open : ''}`}>▼</span>
          👥 Присутні
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
            <p className={styles.emptyText}>Нікого немає.</p>
          )
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle} onClick={() => toggleSection('items')}>
          <span className={`${styles.chevron} ${openSections.items ? styles.open : ''}`}>▼</span>
          📦 Предмети поруч
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
            <p className={styles.emptyText}>Нічого цікавого.</p>
          )
        )}
      </section>

      {environmental_state?.active_hazards?.length > 0 && (
        <section className={`${styles.section} ${styles.hazardSection}`}>
          <h3 className={styles.sectionTitle} onClick={() => toggleSection('hazards')}>
            <span className={`${styles.chevron} ${openSections.hazards ? styles.open : ''}`}>▼</span>
            ⚠️ Небезпеки
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
