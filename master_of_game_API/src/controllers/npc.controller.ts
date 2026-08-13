import { Request, Response, NextFunction } from 'express';
import { DatabaseRepository } from '../persistence/database_repository';
import { NpcService } from '../services/npc.service';

async function getNpcService(req: Request): Promise<NpcService> {
  const sessionId = (req.params.sessionId as string) || (req.query.sessionId as string);
  const authReq = req as any;
  const playerId =
    authReq.user?.login ||
    (authReq.user?.id ? String(authReq.user.id) : null) ||
    (req.headers['x-player-id'] as string) ||
    (req.query.playerId as string) ||
    'default_player';

  let repo = (req as any).dbRepo as DatabaseRepository;
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
      status: (status && status !== 'all') ? status : undefined,
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

    const npc = npcService.getNpc(npcId);
    if (!npc) {
      return res.status(404).json({
        success: false,
        message: `NPC with ID '${npcId}' not found`,
      });
    }

    const isolatedNpc = npcService.toPublicIsolatedNpc(npc);
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
    const { content } = req.body;

    const updatedNpc = npcService.updatePlayerNotes(npcId, content || '');
    return res.json({
      success: true,
      data: {
        content: updatedNpc.knowledge.player_notes.content,
        last_updated: updatedNpc.knowledge.player_notes.last_updated,
      },
    });
  } catch (error) {
    next(error);
  }
};
