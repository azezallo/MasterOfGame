import { Request, Response, NextFunction } from 'express';
import { DatabaseRepository } from '../persistence/database_repository';
import { PersistenceService } from '../persistence/persistence_service';
import { ItemService } from '../services/item.service';

async function getItemService(req: Request): Promise<ItemService> {
  const sessionId = (req.params.sessionId as string) || '';
  const rawPlayerId = (req as any).user?.id;
  const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const persistenceService = new PersistenceService();
  let repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    repo = new DatabaseRepository();
    await repo.initializeDB(playerId, sessionId);
  }
  const itemRepo = repo.getItemRepository();
  return new ItemService(itemRepo);
}

// --- Player UI Controllers (Isolated Data Only) ---

export const getItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemService = await getItemService(req);
    const { owner_type, owner_id, category, query } = req.query as any;

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
