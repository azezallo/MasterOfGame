import { Request, Response } from 'express';
import { SessionMetadataService } from '../services/session_metadata.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const sessionMetadataService = new SessionMetadataService();

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
