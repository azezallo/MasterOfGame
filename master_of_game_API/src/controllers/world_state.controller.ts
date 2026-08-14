import { Request, Response, NextFunction } from 'express';
import { PersistenceService } from '../persistence/persistence_service';

import { WorldStateService } from '../services/world_state.service';
import {
  AdvanceTimeInputSchema,
  OverrideWeatherInputSchema,
  ManageEventInputSchema,
  ManageCalendarEventInputSchema,
} from '../schemas/world_state.schema';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError, AuthError } from '../errors/app.errors';

async function getWorldStateService(req: Request): Promise<WorldStateService> {
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
