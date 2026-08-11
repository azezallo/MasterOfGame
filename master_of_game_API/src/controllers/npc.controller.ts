import { Request, Response, NextFunction } from 'express';
import { DatabaseRepository } from '../persistence/database_repository';
import { PersistenceService } from '../persistence/persistence_service';
import { NpcService } from '../services/npc.service';
import { UpdatePlayerNotesInputSchema } from '../schemas/npc.schema';

async function getNpcService(req: Request): Promise<NpcService> {
  const sessionId = (req.params.sessionId as string) || '';
  const rawPlayerId = (req as any).user?.id;
  const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const persistenceService = new PersistenceService();
  let repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    repo = new DatabaseRepository();
    await repo.initializeDB(playerId, sessionId);
  }
  const npcRepo = repo.getNpcRepository();
  return new NpcService(npcRepo);
}

// GET /sessions/:sessionId/npcs
export const getNpcs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const npcService = await getNpcService(req);
    const { query, location_id, role, relationship_type, status } = req.query as any;

    const npcs = npcService.searchNpcs(query, {
      location_id,
      role,
      relationship_type,
      status,
    });

    const isolatedNpcs = npcs.map(npc => npcService.toPublicIsolatedNpc(npc));

    return res.json({
      success: true,
      data: isolatedNpcs,
    });
  } catch (error) {
    next(error);
  }
};

// GET /sessions/:sessionId/npcs/:id
export const getNpcById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const npcService = await getNpcService(req);
    const npcId = (req.params.id as string) || '';
    const targetNpc = npcService.getNpc(npcId);

    if (!targetNpc) {
      return res.status(404).json({
        success: false,
        message: `NPC '${npcId}' not found`,
      });
    }

    const isolatedNpc = npcService.toPublicIsolatedNpc(targetNpc);

    return res.json({
      success: true,
      data: isolatedNpc,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:sessionId/npcs/:id/notes
export const updatePlayerNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const npcService = await getNpcService(req);
    const npcId = (req.params.id as string) || '';

    const validation = UpdatePlayerNotesInputSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const updatedNpc = npcService.updatePlayerNotes(npcId, validation.data.content);
    const isolatedNpc = npcService.toPublicIsolatedNpc(updatedNpc);

    return res.json({
      success: true,
      data: isolatedNpc,
    });
  } catch (error) {
    next(error);
  }
};
