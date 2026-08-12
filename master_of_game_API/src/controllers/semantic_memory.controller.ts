import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CreateMemoryRecordSchema, SearchMemoryQuerySchema } from '../schemas/semantic_memory.schema';
import { SemanticMemoryService } from '../services/semantic_memory.service';
import { DatabaseRepository } from '../persistence/database_repository';
import { PersistenceService } from '../persistence/persistence_service';
import { ValidationError } from '../errors/app.errors';

async function getSemanticMemoryService(sessionId: string, req: Request): Promise<SemanticMemoryService> {
  const rawPlayerId = (req as any).user?.id;
  const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const persistenceService = new PersistenceService();
  let repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    repo = new DatabaseRepository();
    await repo.initializeDB(playerId, sessionId);
  }
  const memoryRepo = repo.getSemanticMemoryRepository();
  return new SemanticMemoryService(memoryRepo);
}

export const indexRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CreateMemoryRecordSchema.parse(req.body);
    const service = await getSemanticMemoryService(validatedData.session_id, req);

    const record = service.indexRecord(validatedData);

    return res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError(error.issues.map(i => i.message).join(', ')));
    }
    next(error);
  }
};

export const searchMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = SearchMemoryQuerySchema.parse(req.body);
    const service = await getSemanticMemoryService(validatedData.session_id, req);

    const results = service.searchMemory(validatedData);

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError(error.issues.map(i => i.message).join(', ')));
    }
    next(error);
  }
};
