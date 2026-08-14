import { Request, Response, NextFunction } from 'express';

import { PersistenceService } from '../persistence/persistence_service';
import { PlayerStateService } from '../services/player_state.service';
import { PropertyService } from '../services/property.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError, AuthError } from '../errors/app.errors';

async function getPlayerStateService(req: Request): Promise<PlayerStateService> {
  const sessionId = (Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId) || '';
  const user = (req as AuthenticatedRequest).user;
  if (!user || !user.id) {
    throw new AuthError('User not authenticated');
  }
  const playerId = String(user.id);

  const persistenceService = new PersistenceService();
  const repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    throw new AppError(`Session '${sessionId}' not found for player '${playerId}'`, 404);
  }

  const playerStateRepo = repo.getPlayerStateRepository();
  const propertyRepo = repo.getPropertyRepository();
  const itemRepo = repo.getItemRepository();
  const propertyService = new PropertyService(propertyRepo, itemRepo, playerStateRepo);

  return new PlayerStateService(playerStateRepo, propertyService);
}

export const getPlayerState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await getPlayerStateService(req);
    const sessionId = (Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId) || '';

    const data = service.getPlayerState(sessionId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
