import { Request, Response, NextFunction } from 'express';
import { PersistenceService } from '../persistence/persistence_service';
import { LocationRepository } from '../repositories/location.repository';
import { LocationService } from '../services/location.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const getMapLocationsSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  }),
  query: z.object({
    parent_location_id: z.string().optional()
  })
});

export const getMapLocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validation = getMapLocationsSchema.safeParse({
      params: req.params,
      query: req.query
    });

    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: validation.error.issues });
    }

    const { sessionId } = validation.data.params;
    const { parent_location_id } = validation.data.query;
    
    const playerId = req.user?.id?.toString();
    if (!playerId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const persistenceService = new PersistenceService();
    const repo = await persistenceService.loadSessionRepo(playerId, sessionId);
    if (!repo) {
      return res.status(404).json({ success: false, message: 'Session not found or not loaded' });
    }

    const locationRepo = repo.getLocationRepository();
    const locationService = new LocationService(locationRepo);
    
    const safeLocations = locationService.getMapTiles(parent_location_id || null);

    return res.status(200).json({ success: true, data: safeLocations });
  } catch (error) {
    next(error);
  }
};
