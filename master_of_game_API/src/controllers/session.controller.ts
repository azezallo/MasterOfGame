import { Request, Response } from 'express';
import { SessionMetadataService } from '../services/session_metadata.service';
import { PersistenceService } from '../persistence/persistence_service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CreateSessionSchema } from '../schemas/session_creation.schema';
import { ValidationError, PersistenceError } from '../errors/app_errors';

const sessionMetadataService = new SessionMetadataService();
const persistenceService = new PersistenceService();

export const getSessions = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || !user.id) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  const sessions = await sessionMetadataService.getAvailableSessions(user.id.toString());
  return res.status(200).json({
    success: true,
    data: sessions,
  });
};

export const createSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const validatedData = CreateSessionSchema.parse(req.body);
    const sessionId = await persistenceService.createSession(user.id.toString(), validatedData.gameName, validatedData.characterName, validatedData.mapSize);
    
    return res.status(200).json({
      success: true,
      data: {
        session_id: sessionId,
        game_name: validatedData.gameName,
        character_name: validatedData.characterName,
        map_size: validatedData.mapSize,
        created_at: Math.floor(Date.now() / 1000),
        last_played_at: Math.floor(Date.now() / 1000),
      }
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    } else if (error instanceof PersistenceError) {
      return res.status(500).json({ success: false, message: error.message });
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
      return res.status(500).json({ success: false, message: errorMessage });
    }
  }
};
