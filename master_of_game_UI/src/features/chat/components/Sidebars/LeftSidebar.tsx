import React from 'react';
import { PropertyWidget } from '../../../property';

interface LeftSidebarProps {
  sessionId: string;
  playerId?: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ sessionId, playerId }) => {
  const activePlayerId = playerId || 'player_1';

  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
      <PropertyWidget sessionId={sessionId} ownerType="player" ownerId={activePlayerId} />
    </div>
  );
};
