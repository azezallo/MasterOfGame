import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_PATH = process.env.DATABASE_PATH || 'saves/users.db';

const db = new Database(DATABASE_PATH);

const schema = `
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    login TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY(login) REFERENCES players(login)
  );
`;

try {
  db.exec(schema);
  console.log('Database migration successful');
} catch (error) {
  console.error('Database migration failed', error);
  process.exit(1);
} finally {
  db.close();
}
