import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnvironmentSidebar } from '@/features/map/components/EnvironmentSidebar/EnvironmentSidebar';
import { InteractiveMapModal } from '@/features/map/components/InteractiveMapModal/InteractiveMapModal';
import { getMapLocations } from '../../../../api/location';
import type { LocationData } from '../../../../types/location';

interface RightSidebarProps {
  sessionId: string;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  
  // States for map drill-down
  const [mapParentId, setMapParentId] = useState<string | undefined>(undefined);
  const [mapHistory, setMapHistory] = useState<LocationData[]>([]);
  const [currentMapContext, setCurrentMapContext] = useState<LocationData | null>(null);
  
  useEffect(() => {
    const controller = new AbortController();

    const fetchLocation = async () => {
      try {
        setIsLoading(true);
        const response = await getMapLocations(sessionId, mapParentId, controller.signal);
        if (response.success && response.data) {
          setLocations(response.data);
          
          // Set currentLocation only on the first load of the root map
          if (response.data.length > 0 && !mapParentId && !currentLocation) {
            setCurrentLocation(response.data[0]);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Failed to fetch location data:', error);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    if (sessionId) {
      fetchLocation();
    }

    return () => {
      controller.abort();
    };
  }, [sessionId, mapParentId]); // Refetch when mapParentId changes

  const handleLocationSelect = async (loc: LocationData) => {
    // Try to drill down by setting this location as the new parent
    // Always push the current context (even if null) so popping restores exactly where we were.
    setMapHistory(prev => [...prev, currentMapContext as any]);
    setCurrentMapContext(loc);
    setMapParentId(loc.location_id);
  };

  const handleMapBack = () => {
    setMapHistory(prev => {
      const newHistory = [...prev];
      const previousContext = newHistory.pop();
      setCurrentMapContext(previousContext || null);
      setMapParentId(previousContext ? previousContext.location_id : undefined);
      return newHistory;
    });
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === mapHistory.length) return; // Clicking current level

    setMapHistory(prev => {
      const newHistory = prev.slice(0, index);
      const clickedContext = prev[index];
      setCurrentMapContext(clickedContext || null);
      setMapParentId(clickedContext ? clickedContext.location_id : undefined);
      return newHistory;
    });
  };

  const toggleMap = () => setIsMapOpen(prev => !prev);

  if (isLoading) {
    return (
      <div style={{ padding: '15px', color: 'var(--color-text-dim)', textAlign: 'center' }}>
        <p style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>{t('map.loading_environment')}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Map Button as a distinct action */}
      <div style={{ padding: '10px 15px' }}>
        <button 
          onClick={toggleMap}
          style={{ 
            width: '100%', 
            padding: '8px', 
            background: 'var(--color-bg-secondary)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '4px',
            color: 'var(--color-text)',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
        >
          🗺️ {t('map.open_map')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!currentLocation ? (
          <div style={{ padding: '15px', color: 'var(--color-text-dim)', textAlign: 'center' }}>
            <p style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>{t('chat.right_sidebar')}</p>
            <p style={{ fontSize: '0.8rem' }}>{t('map.location_data_missing')}</p>
          </div>
        ) : (
          <EnvironmentSidebar location={currentLocation} />
        )}
      </div>

      <InteractiveMapModal 
        isOpen={isMapOpen} 
        onClose={() => setIsMapOpen(false)} 
        locations={locations}
        sessionId={sessionId}
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
