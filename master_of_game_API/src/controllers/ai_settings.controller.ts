import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AISettingsService } from '../services/ai_settings.service';
import { ValidationError, AuthError } from '../errors/app.errors';

const aiSettingsService = new AISettingsService();

export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const settings = await aiSettingsService.getSettings(user.id);
    return res.status(200).json(settings);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ success: false, message: error.message });
    }
    const message = error instanceof Error ? error.message : 'Failed to retrieve AI settings';
    return res.status(500).json({ success: false, message });
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const updatedSettings = await aiSettingsService.saveSettings(user.id, req.body);
    return res.status(200).json(updatedSettings);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    const message = error instanceof Error ? error.message : 'Failed to update AI settings';
    return res.status(500).json({ success: false, message });
  }
};

export const testConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
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
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    const message = error instanceof Error ? error.message : 'Failed to test connection';
    return res.status(500).json({ success: false, message });
  }
};
