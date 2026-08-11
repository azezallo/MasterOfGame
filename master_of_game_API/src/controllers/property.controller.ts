import { Request, Response, NextFunction } from 'express';
import { DatabaseRepository } from '../persistence/database_repository';
import { PersistenceService } from '../persistence/persistence_service';
import { PropertyService } from '../services/property.service';
import { PayRentInputSchema, StorageTransferInputSchema, ToggleBackpackInputSchema } from '../schemas/property.schema';

async function getPropertyService(req: Request): Promise<PropertyService> {
  const sessionId = (req.params.sessionId as string) || '';
  const rawPlayerId = (req as any).user?.id;
  const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const persistenceService = new PersistenceService();
  let repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    repo = new DatabaseRepository();
    await repo.initializeDB(playerId, sessionId);
  }
  const propertyRepo = repo.getPropertyRepository();
  const itemRepo = repo.getItemRepository();
  return new PropertyService(propertyRepo, itemRepo);
}

export const getPlayerProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyService = await getPropertyService(req);
    const rawPlayerId = (req as any).user?.id;
    const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

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
    const rawPlayerId = (req as any).user?.id;
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
    const rawPlayerId = (req as any).user?.id;
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
    const rawPlayerId = (req as any).user?.id;
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
