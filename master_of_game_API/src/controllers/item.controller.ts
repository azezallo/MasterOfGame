import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { PersistenceService } from '../persistence/persistence_service';
import { ItemService } from '../services/item.service';
import { AppError, AuthError } from '../errors/app.errors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const persistenceService = new PersistenceService();


async function getItemService(req: Request): Promise<ItemService> {
  const sessionId = (req.params.sessionId as string) || (req.query.sessionId as string) || '';
  const user = (req as AuthenticatedRequest).user;
  if (!user || !user.id) {
    throw new AuthError('User not authenticated');
  }
  const playerId = String(user.id);
  const repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    throw new AppError(`Session '${sessionId}' not found for player '${playerId}'`, 404);
  }
  const itemRepo = repo.getItemRepository();
  return new ItemService(itemRepo);
}

// --- Player UI Controllers (Isolated Data Only) ---

export const getItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemService = await getItemService(req);
    const GetItemsQuerySchema = z.object({
      owner_type: z.string().optional(),
      owner_id: z.string().optional(),
      category: z.string().optional(),
      query: z.string().optional()
    });
    
    const { owner_type, owner_id, category, query } = GetItemsQuerySchema.parse(req.query);

    const items = itemService.searchItems({
      query,
      owner_type,
      owner_id,
      category,
    });

    const isolatedItems = items.map(item => itemService.toPublicIsolatedItem(item));

    return res.json({
      success: true,
      data: isolatedItems,
    });
  } catch (error) {
    next(error);
  }
};

export const getItemById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemService = await getItemService(req);
    const { itemId } = req.params;

    const targetItem = itemService.getItem(itemId as string);
    if (!targetItem) {
      return res.status(404).json({
        success: false,
        message: `Item '${itemId}' not found`,
      });
    }

    const isolatedItem = itemService.toPublicIsolatedItem(targetItem);

    return res.json({
      success: true,
      data: isolatedItem,
    });
  } catch (error) {
    next(error);
  }
};
