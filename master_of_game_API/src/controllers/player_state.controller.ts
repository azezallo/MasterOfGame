import { Request, Response, NextFunction } from 'express';
import { DatabaseRepository } from '../persistence/database_repository';
import { PersistenceService } from '../persistence/persistence_service';
import { PlayerStateService } from '../services/player_state.service';
import { PropertyService } from '../services/property.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

async function getPlayerStateService(req: Request): Promise<PlayerStateService> {
  const sessionId = (Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId) || '';
  const rawPlayerId = (req as AuthenticatedRequest).user?.id;
  const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const persistenceService = new PersistenceService();
  let repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    repo = new DatabaseRepository();
    await repo.initializeDB(playerId, sessionId);
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
