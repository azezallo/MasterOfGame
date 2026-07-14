import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BASE_DIR = process.cwd();

export const CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SAVES_DIR: path.resolve(BASE_DIR, 'saves'),
  DATABASE_PATH: process.env.DATABASE_PATH || 'saves/users.db',
  SESSION_DURATION_SECONDS: parseInt(process.env.SESSION_DURATION_SECONDS || '3600', 10),
};

// Ensure saves directory exists
import fs from 'fs';
if (!fs.existsSync(CONFIG.SAVES_DIR)) {
  fs.mkdirSync(CONFIG.SAVES_DIR, { recursive: true });
}

export default CONFIG;
