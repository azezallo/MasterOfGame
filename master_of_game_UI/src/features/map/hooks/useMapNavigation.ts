import { useState, useEffect } from 'react';
import { getMapLocations } from '@/features/map/api/location';
import type { LocationData } from '@/types/location';

export const useMapNavigation = (sessionId: string) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  
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
  }, [sessionId, mapParentId]); 

  const handleLocationSelect = async (loc: LocationData) => {
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
    if (index === mapHistory.length) return;

    setMapHistory(prev => {
      const newHistory = prev.slice(0, index);
      const clickedContext = prev[index];
      setCurrentMapContext(clickedContext || null);
      setMapParentId(clickedContext ? clickedContext.location_id : undefined);
      return newHistory;
    });
  };

  const toggleMap = () => setIsMapOpen(prev => !prev);
  const closeMap = () => setIsMapOpen(false);

  return {
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
  };
};
