import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.resolve(LOG_DIR, 'master_of_game.log');

function ensureLogDir(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch {}
}

let logStream: fs.WriteStream | null = null;

function getLogStream(): fs.WriteStream {
  if (!logStream) {
    ensureLogDir();
    logStream = fs.createWriteStream(LOG_FILE, { flags: 'a', highWaterMark: 16384 });
  }
  return logStream;
}

function writeToFile(level: string, message: string, meta?: any): void {
  try {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta || {}),
    });
    getLogStream().write(entry + '\n');
  } catch {}
}

/**
 * Enhanced structured logger that outputs formatted console messages and writes to logs/master_of_game.log.
 */
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
    writeToFile('info', message, meta);
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
    writeToFile('warn', message, meta);
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
    writeToFile('error', message, meta);
  },
  debug: (message: string, meta?: any) => {
    console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
    writeToFile('debug', message, meta);
  },
  llm: (message: string, meta?: any) => {
    console.log(`[LLM] [${new Date().toISOString()}] 🤖 ${message}`, meta ? JSON.stringify(meta) : '');
    writeToFile('llm', message, meta);
  },
  subagent: (message: string, meta?: any) => {
    console.log(`[SUBAGENT] [${new Date().toISOString()}] ⚙️ ${message}`, meta ? JSON.stringify(meta) : '');
    writeToFile('subagent', message, meta);
  },
};
