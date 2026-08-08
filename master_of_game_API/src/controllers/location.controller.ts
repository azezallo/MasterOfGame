import { Request, Response, NextFunction } from 'express';
import { PersistenceService } from '../persistence/persistence_service';
import { LocationRepository } from '../repositories/location.repository';
import { LocationService } from '../services/location.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getMapLocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const parentLocationId = req.query.parent_location_id as string | undefined;
    
    const playerId = req.user?.id?.toString();
    if (!playerId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const persistenceService = new PersistenceService();
    const repo = await persistenceService.loadSessionRepo(playerId, sessionId);
    if (!repo) {
      return res.status(404).json({ success: false, message: 'Session not found or not loaded' });
    }

    const db = repo.getDb();
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database not initialized' });
    }

    const locationRepo = new LocationRepository(db);
    // Return all locations for the given parent, or root locations if parent is not specified
    const locations = locationRepo.findByParentId(parentLocationId || null);
    
    // For the UI map, we might want to filter out hidden secrets using the service if we returned specific contexts,
    // but here we are just returning map tiles. We should strip hidden transitions manually or just send it and let frontend handle it.
    // However, the spec says "Бекенд повиннен автоматично відфільтровувати всі hidden переходи... перед відправкою даних на клієнт".
    
    const locationService = new LocationService(locationRepo);
    
    const safeLocations = locations.map(loc => {
       const safeLoc = locationService.getLocationContext(loc.location_id, 'NAVIGATION_MODE');
       // getLocationContext strips hidden transitions/secrets but removes coordinates. We need coordinates for the map!
       return {
         ...safeLoc,
         matrix_coordinates: loc.matrix_coordinates,
         parent_location_id: loc.parent_location_id,
         location_type: loc.location_type
       };
    });

    return res.status(200).json({ success: true, data: safeLocations });
  } catch (error) {
    next(error);
  }
};
