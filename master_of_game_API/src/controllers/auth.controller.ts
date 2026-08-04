import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterSchema, LoginSchema } from '../schemas/auth.schema';
import { ValidationError, AuthError } from '../errors/app.errors';
import { logger } from '../logger';

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);
    await authService.register(validatedData.login, validatedData.password);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error(`Register controller error: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = LoginSchema.parse(req.body);
    const result = await authService.login(validatedData.login, validatedData.password);
    
    res.cookie('session_id', result.session_id, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: 'lax',
      maxAge: result.expires_at * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      player: result.player,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    return res.status(200).json({
      success: true,
      message: 'Success',
      player: user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
