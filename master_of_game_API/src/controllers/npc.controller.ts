import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { PersistenceService } from '../persistence/persistence_service';
import { NpcService } from '../services/npc.service';
import { AppError, AuthError } from '../errors/app.errors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

async function getNpcService(req: Request): Promise<NpcService> {
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
    const { content } = z.object({ content: z.string() }).parse(req.body);

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
