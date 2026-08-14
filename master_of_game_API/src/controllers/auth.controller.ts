import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterSchema, LoginSchema } from '../schemas/auth.schema';
import { AuthError } from '../errors/app.errors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const authService = new AuthService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);
    await authService.register(validatedData.login, validatedData.password);
    const loginResult = await authService.login(validatedData.login, validatedData.password);

    res.cookie('session_id', loginResult.session_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: loginResult.expires_at * 1000,
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      player: loginResult.player,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = LoginSchema.parse(req.body);
    const result = await authService.login(validatedData.login, validatedData.password);
    
    res.cookie('session_id', result.session_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.expires_at * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      player: result.player,
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AuthError('User not authenticated');
    }

    return res.status(200).json({
      success: true,
      message: 'Success',
      player: user,
    });
  } catch (error) {
    next(error);
  }
};
