import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyWidget } from '../../../property';
import { PlayerStatePanel } from '../../../playerState';
import styles from './LeftSidebar.module.css';

interface LeftSidebarProps {
  sessionId: string;
  playerId?: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ sessionId, playerId }) => {
  const { t } = useTranslation();
  const activePlayerId = playerId || 'player_1';
  const [activeTab, setActiveTab] = useState<'state' | 'property'>('state');

  return (
    <div className={styles.container}>
      <div className={styles.tabsHeader}>
        <button
          onClick={() => setActiveTab('state')}
          className={`${styles.tabButton} ${activeTab === 'state' ? styles.active : ''}`}
        >
          {t('player_state.sidebar_tab_state', '👤 Стан')}
        </button>
        <button
          onClick={() => setActiveTab('property')}
          className={`${styles.tabButton} ${activeTab === 'property' ? styles.active : ''}`}
        >
          {t('player_state.sidebar_tab_property', '🎒 Майно')}
        </button>
      </div>

      <div className={styles.contentArea}>
        {activeTab === 'state' ? (
          <PlayerStatePanel sessionId={sessionId} />
        ) : (
          <PropertyWidget sessionId={sessionId} ownerType="player" ownerId={activePlayerId} />
        )}
      </div>
    </div>
  );
};
