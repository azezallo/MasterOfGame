import Database from 'better-sqlite3';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_PATH = process.env.DATABASE_PATH || 'saves/users.db';
const db = new Database(DATABASE_PATH);

const tables = ['players', 'sessions'];
tables.forEach(table => {
  try {
    db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
    console.log(`Table '${table}' exists.`);
  } catch (e) {
    console.log(`Table '${table}' does not exist.`);
  }
});

db.close();
