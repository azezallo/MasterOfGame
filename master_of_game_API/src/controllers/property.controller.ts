import { Request, Response, NextFunction } from 'express';

import { PersistenceService } from '../persistence/persistence_service';
import { PropertyService } from '../services/property.service';
import { PayRentInputSchema, StorageTransferInputSchema, ToggleBackpackInputSchema } from '../schemas/property.schema';
import { AppError, AuthError } from '../errors/app.errors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

async function getPropertyService(req: Request): Promise<PropertyService> {
  const sessionId = (req.params.sessionId as string) || (req.query.sessionId as string) || '';
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
  const propertyRepo = repo.getPropertyRepository();
  const itemRepo = repo.getItemRepository();
  return new PropertyService(propertyRepo, itemRepo);
}

export const getPlayerProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyService = await getPropertyService(req);
    const user = (req as AuthenticatedRequest).user!;
    const playerId = String(user.id);

    const profile = propertyService.getOwnerProperty('player', playerId);
    const isolated = propertyService.toPublicIsolatedProperty(profile, 'player', playerId);

    return res.json({
      success: true,
      data: isolated,
    });
  } catch (error) {
    next(error);
  }
};

export const payRent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyService = await getPropertyService(req);
    const rawPlayerId = (req as AuthenticatedRequest).user?.id;
    const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';
    const body = PayRentInputSchema.parse(req.body);

    const updatedProfile = propertyService.payRent(playerId, body.property_id, body.days_to_pay);

    return res.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleBackpack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyService = await getPropertyService(req);
    const rawPlayerId = (req as AuthenticatedRequest).user?.id;
    const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';
    const body = ToggleBackpackInputSchema.parse({ ...req.body, owner_id: playerId });

    const updatedProfile = propertyService.toggleBackpack(body);

    return res.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const storageTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyService = await getPropertyService(req);
    const rawPlayerId = (req as AuthenticatedRequest).user?.id;
    const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';
    const body = StorageTransferInputSchema.parse(req.body);

    const updatedProfile = propertyService.transferToFromStorage(
      playerId,
      body.storage_cache_id,
      body.action,
      body.item_id,
      body.quantity
    );

    return res.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};
