import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { initSchema } from './schema.js';
import { seedDatabase } from './seed.js';

let dbInstance: BetterSqlite3.Database | null = null;

export const initDatabase = (): BetterSqlite3.Database => {
  if (dbInstance) {
    return dbInstance;
  }

  // 1. Ensure the directory exists
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`[Database] Created database directory at: ${dbDir}`);
  }

  // 2. Open SQLite database
  const db = new Database(config.dbPath);
  console.log(`[Database] Connected to SQLite database at: ${config.dbPath}`);

  // 3. Enable foreign key support
  db.pragma('foreign_keys = ON');

  // Verify foreign key enforcement
  const foreignKeysStatus = db.pragma('foreign_keys', { simple: true });
  console.log(`[Database] Foreign keys enabled: ${foreignKeysStatus === 1}`);

  // 4. Initialize schema (tables & indexes)
  initSchema(db);

  // 5. Run initial development seed (if not already seeded)
  seedDatabase(db);

  dbInstance = db;
  return dbInstance;
};

export const getDb = (): BetterSqlite3.Database => {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
};
