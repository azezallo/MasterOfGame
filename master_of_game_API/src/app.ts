import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import sessionRoutes from './routes/session.routes';
import aiSettingsRoutes from './routes/ai_settings.routes';
import semanticMemoryRoutes from './routes/semantic_memory.routes';
import agenticLoopRoutes from './routes/agentic_loop.routes';
import { AppError } from './errors/app.errors';

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // Вкажіть конкретний домен замість '*'
  credentials: true,                // Дозвольте передачу куків
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/api/v1/ai', aiSettingsRoutes);
app.use('/api/v1/memory', semanticMemoryRoutes);
app.use('/api/v1/chat', agenticLoopRoutes);

// Global Error Handler
app.use((err: any, req: any, res:any, next: any) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }
  console.error(err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

export default app;
