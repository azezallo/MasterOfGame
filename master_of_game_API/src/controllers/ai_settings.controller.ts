import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AISettingsService } from '../services/ai_settings.service';
import { AuthError } from '../errors/app.errors';


const aiSettingsService = new AISettingsService();

export const getSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      throw new AuthError('User not authenticated');
    }

    const settings = await aiSettingsService.getSettings(user.id);
    return res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      throw new AuthError('User not authenticated');
    }

    const updatedSettings = await aiSettingsService.saveSettings(user.id, req.body);
    return res.status(200).json(updatedSettings);
  } catch (error) {
    next(error);
  }
};

export const testConnection = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      throw new AuthError('User not authenticated');
    }

    const result = await aiSettingsService.testConnection(req.body);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || {
          code: 'CONNECTION_FAILED',
          providerId: req.body.providerId || 'openai_compatible',
          message: result.message,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};
