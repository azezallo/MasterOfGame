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
import { ValidationError, AppError, AuthError } from '../errors/app.errors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { SessionStreamBroker } from '../services/agentic_loop/session_stream_broker.service';

const persistenceService = new PersistenceService();


async function getSessionRepo(sessionId: string, req: Request): Promise<DatabaseRepository> {
  const user = (req as AuthenticatedRequest).user;
  if (!user || !user.id) {
    throw new AuthError('User not authenticated');
  }
  const playerId = String(user.id);
  const repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    throw new AppError(`Session '${sessionId}' not found for player '${playerId}'`, 404);
  }
  return repo;
}

async function getLLMProviderAndModel(req: Request): Promise<{ provider?: ILLMProvider; modelName?: string }> {
  const user = (req as AuthenticatedRequest).user;
  const userId = user && user.id ? String(user.id) : '1';

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

function formatTimestamp(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const isoString = raw.includes('T') ? raw : raw.replace(' ', 'T') + (raw.endsWith('Z') ? '' : 'Z');
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return undefined;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return undefined;
  }
}

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
      timestamp: formatTimestamp(msg.created_at),
    }));

    const lastMsg = rawMessages[rawMessages.length - 1];
    const isTurnInProgress = SessionStreamBroker.getInstance().isSessionActive(sessionId) || (lastMsg ? lastMsg.role === 'player' : false);

    return res.status(200).json({
      success: true,
      data: {
        messages,
        isTurnInProgress,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reconnectStream = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.query.sessionId as string) || (req.params.sessionId as string);
    if (!sessionId) {
      return next(new ValidationError('sessionId parameter is required for stream reconnection'));
    }

    const broker = SessionStreamBroker.getInstance();
    broker.addSubscriber(sessionId, res);
  } catch (error) {
    next(error);
  }
};
