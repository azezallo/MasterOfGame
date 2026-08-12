import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { StreamChatInputSchema, CompressChatInputSchema } from '../types/agentic_loop.types';
import { AgenticLoopService } from '../services/agentic_loop/agentic_loop.service';
import { CompressionService } from '../services/agentic_loop/compression.service';
import { AISettingsService } from '../services/ai_settings.service';
import { LLMProviderFactory } from '../providers/llm/llm_provider.factory';
import { ILLMProvider } from '../providers/llm/llm_provider.interface';
import { DatabaseRepository } from '../persistence/database_repository';
import { PersistenceService } from '../persistence/persistence_service';
import { ValidationError } from '../errors/app.errors';

async function getSessionRepo(sessionId: string, req: Request): Promise<DatabaseRepository> {
  const rawPlayerId = (req as any).user?.id;
  const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const persistenceService = new PersistenceService();
  let repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    repo = new DatabaseRepository();
    await repo.initializeDB(playerId, sessionId);
  }
  return repo;
}

async function getLLMProviderAndModel(req: Request): Promise<{ provider?: ILLMProvider; modelName?: string }> {
  const rawPlayerId = (req as any).user?.id;
  const userId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const aiSettingsService = new AISettingsService();
  try {
    const { settings, apiKey } = await aiSettingsService.getDecryptedSettings(userId);
    if (settings) {
      const provider = LLMProviderFactory.createFromSettings(settings, apiKey);
      return { provider, modelName: settings.modelName };
    }
  } catch {
    // If settings not configured yet in DB, load defaults
    try {
      const defaultSettings = await aiSettingsService.getSettings(userId);
      const provider = LLMProviderFactory.getProvider(defaultSettings.providerId, {
        customEndpoint: defaultSettings.customEndpoint,
      });
      return { provider, modelName: defaultSettings.modelName };
    } catch {}
  }

  // Default fallback provider
  const fallbackProvider = LLMProviderFactory.getProvider('openai_compatible', {
    customEndpoint: 'http://localhost:1234/v1',
  });
  return { provider: fallbackProvider, modelName: 'Qwen2.5-7B-Instruct' };
}

export const streamTurn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = StreamChatInputSchema.parse(req.body);
    const repo = await getSessionRepo(validatedData.sessionId, req);
    const memoryRepo = repo.getSemanticMemoryRepository();

    const { provider, modelName } = await getLLMProviderAndModel(req);

    const service = new AgenticLoopService(repo, provider, undefined, modelName);
    await service.runStreamTurn(validatedData.sessionId, validatedData.actionText, res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError(error.issues.map((i) => i.message).join(', ')));
    }
    next(error);
  }
};

export const compressContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CompressChatInputSchema.parse(req.body);
    const repo = await getSessionRepo(validatedData.sessionId, req);

    const { provider } = await getLLMProviderAndModel(req);

    const compressionService = new CompressionService(repo, provider);
    const result = await compressionService.compressSessionContext(validatedData.sessionId, true);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError(error.issues.map((i) => i.message).join(', ')));
    }
    next(error);
  }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.query.sessionId as string) || (req.params.sessionId as string);
    if (!sessionId) {
      return next(new ValidationError('sessionId parameter is required'));
    }

    const repo = await getSessionRepo(sessionId, req);
    const agenticRepo = repo.getAgenticLoopRepository();
    const rawMessages = agenticRepo.getAllLongContext(sessionId);

    const messages = rawMessages.map((msg) => ({
      id: String(msg.id || `msg_${msg.turn_number}_${msg.role}`),
      type: msg.role === 'player' ? 'player' : 'master',
      text: msg.content,
      timestamp: msg.created_at
        ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined,
    }));

    return res.status(200).json({
      success: true,
      data: {
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};
