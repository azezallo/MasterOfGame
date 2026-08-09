import React from 'react';
import { useTranslation } from 'react-i18next';
import { EnvironmentSidebar } from '@/features/map/components/EnvironmentSidebar/EnvironmentSidebar';
import { InteractiveMapModal } from '@/features/map/components/InteractiveMapModal/InteractiveMapModal';
import { useMapNavigation } from '@/features/map/hooks/useMapNavigation';
import styles from './RightSidebar.module.css';

interface RightSidebarProps {
  sessionId: string;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  
  const {
    currentLocation,
    locations,
    isLoading,
    isMapOpen,
    currentMapContext,
    mapHistory,
    handleLocationSelect,
    handleMapBack,
    handleBreadcrumbClick,
    toggleMap,
    closeMap
  } = useMapNavigation(sessionId);

  return (
    <div className={styles.container}>
      <div className={styles.mapButtonContainer}>
        <button 
          onClick={toggleMap}
          className={styles.mapButton}
        >
          🗺️ {t('map.open_map')}
        </button>
      </div>

      <div className={styles.environmentContainer}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>{t('map.loading_environment')}</p>
          </div>
        ) : !currentLocation ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>{t('chat.right_sidebar')}</p>
            <p className={styles.emptyStateSubtitle}>{t('map.location_data_missing')}</p>
          </div>
        ) : (
          <EnvironmentSidebar location={currentLocation} />
        )}
      </div>

      <InteractiveMapModal 
        isOpen={isMapOpen} 
        onClose={closeMap} 
        locations={locations}
        currentLocationId={currentLocation?.location_id}
        currentMapContext={currentMapContext}
        mapHistory={mapHistory}
        onLocationSelect={handleLocationSelect}
        onBack={mapHistory.length > 0 || currentMapContext ? handleMapBack : undefined}
        onBreadcrumbClick={handleBreadcrumbClick}
      />
    </div>
  );
};
