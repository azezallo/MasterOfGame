import { Request, Response, NextFunction } from 'express';
import { PersistenceService } from '../persistence/persistence_service';
import { MagicService } from '../services/magic.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { SpellCostInputSchema, ManaRegenCalcInputSchema } from '../schemas/magic.schema';
import { AppError } from '../errors/app.errors';

async function getMagicService(req: Request): Promise<MagicService> {
  const sessionId = (Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId) || '';
  const rawPlayerId = (req as AuthenticatedRequest).user?.id;
  const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const persistenceService = new PersistenceService();
  let repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    throw new AppError('Session database connection failed', 404);
  }

  const playerStateRepo = repo.getPlayerStateRepository();
  const locationRepo = repo.getLocationRepository();

  return new MagicService(playerStateRepo, locationRepo);
}

export const calculateSpellCost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const magicService = new MagicService();
    const validatedInput = SpellCostInputSchema.parse(req.body);
    const result = magicService.calculateSpellCost(validatedInput);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const recalculateRegen = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId) || '';
    const magicService = await getMagicService(req);

    const validatedInput = ManaRegenCalcInputSchema.parse(req.body);
    const result = magicService.recalculatePassiveManaRegen(
      sessionId,
      validatedInput.hours,
      validatedInput.location_density
    );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const evaluateMagicItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const magicService = new MagicService();
    const itemProps = req.body.properties ?? req.body;
    const result = magicService.evaluateMagicItemProperties(itemProps);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
