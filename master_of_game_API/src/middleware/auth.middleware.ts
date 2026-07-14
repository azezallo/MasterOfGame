import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthError } from '../errors/app.errors';

const authService = new AuthService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    login: string;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.session_id;

  if (!sessionId) {
    return next(new AuthError('Session ID is missing'));
  }

  try {
    const sessionData = await authService.getSession(sessionId);
    req.user = {
      id: sessionData.player.id,
      login: sessionData.player.login,
    };
    next();
  } catch (error) {
    next(error as AuthError);
  }
};
