import express, { ErrorRequestHandler } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import sessionRoutes from './routes/session.routes';
import aiSettingsRoutes from './routes/ai_settings.routes';
import semanticMemoryRoutes from './routes/semantic_memory.routes';
import agenticLoopRoutes from './routes/agentic_loop.routes';
import { AppError } from './errors/app.errors';
import { logger } from './logger';

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-player-id'],
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/ai', aiSettingsRoutes);
app.use('/api/v1/memory', semanticMemoryRoutes);
app.use('/api/v1/chat', agenticLoopRoutes);

// Global Error Handler
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }
  logger.error(err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
app.use(errorHandler);

export default app;
