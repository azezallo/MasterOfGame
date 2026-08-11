import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyWidget } from '../../../property';
import { PlayerStatePanel } from '../../../playerState';

interface LeftSidebarProps {
  sessionId: string;
  playerId?: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ sessionId, playerId }) => {
  const { t } = useTranslation();
  const activePlayerId = playerId || 'player_1';
  const [activeTab, setActiveTab] = useState<'state' | 'property'>('state');

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.8)',
        padding: '0.4rem 0.5rem',
        gap: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('state')}
          style={{
            flex: 1,
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'state' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            color: activeTab === 'state' ? '#38bdf8' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
          }}
        >
          {t('player_state.sidebar_tab_state', '👤 Стан')}
        </button>
        <button
          onClick={() => setActiveTab('property')}
          style={{
            flex: 1,
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'property' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            color: activeTab === 'property' ? '#38bdf8' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
          }}
        >
          {t('player_state.sidebar_tab_property', '🎒 Майно')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {activeTab === 'state' ? (
          <PlayerStatePanel sessionId={sessionId} />
        ) : (
          <PropertyWidget sessionId={sessionId} ownerType="player" ownerId={activePlayerId} />
        )}
      </div>
    </div>
  );
};
