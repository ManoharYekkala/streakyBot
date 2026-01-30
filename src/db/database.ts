import Database from "better-sqlite3";
import path from "path";
import { SCHEMA, DEFAULT_CONFIG, ConfigKey } from "./schema";

let db: Database.Database;

export function initDatabase(dbPath: string): Database.Database {
  const resolvedPath = path.resolve(dbPath);
  db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  initDefaultConfig();
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase first.");
  }
  return db;
}

function initDefaultConfig(): void {
  const insertConfig = db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)");

  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    insertConfig.run(key, JSON.stringify(value));
  }
}

export function getConfig<K extends ConfigKey>(key: K): (typeof DEFAULT_CONFIG)[K] {
  const row = db.prepare("SELECT value FROM config WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) {
    return DEFAULT_CONFIG[key];
  }
  return JSON.parse(row.value);
}

export function setConfig<K extends ConfigKey>(key: K, value: (typeof DEFAULT_CONFIG)[K]): void {
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(
    key,
    JSON.stringify(value),
  );
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
