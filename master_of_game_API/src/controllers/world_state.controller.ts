import { Request, Response, NextFunction } from 'express';
import { PersistenceService } from '../persistence/persistence_service';
import { DatabaseRepository } from '../persistence/database_repository';
import { WorldStateService } from '../services/world_state.service';
import {
  AdvanceTimeInputSchema,
  OverrideWeatherInputSchema,
  ManageEventInputSchema,
  ManageCalendarEventInputSchema,
} from '../schemas/world_state.schema';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

async function getWorldStateService(req: Request): Promise<WorldStateService> {
  const sessionId = (Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId) || '';
  const rawPlayerId = (req as AuthenticatedRequest).user?.id;
  const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const persistenceService = new PersistenceService();
  let repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    repo = new DatabaseRepository();
    await repo.initializeDB(playerId, sessionId);
  }

  const worldStateRepo = repo.getWorldStateRepository();
  return new WorldStateService(worldStateRepo);
}

export const getWorldState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await getWorldStateService(req);
    const locationId = (req.query.location_id as string) || undefined;
    const data = service.getWorldState(locationId);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const advanceTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await getWorldStateService(req);
    const body = AdvanceTimeInputSchema.parse(req.body);
    const data = service.advanceTime(body);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const overrideWeather = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await getWorldStateService(req);
    const body = OverrideWeatherInputSchema.parse(req.body);
    const data = service.overrideWeather(body);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const manageEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await getWorldStateService(req);
    const body = ManageEventInputSchema.parse(req.body);
    const data = service.manageEvent(body);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const manageCalendarEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await getWorldStateService(req);
    const body = ManageCalendarEventInputSchema.parse(req.body);
    const data = service.manageCalendarEvent(body);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
