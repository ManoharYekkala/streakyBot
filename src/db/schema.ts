export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_study_days INTEGER DEFAULT 0,
    last_study_date TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
    topics TEXT DEFAULT '[]',
    started_at INTEGER NOT NULL,
    total_duration_mins INTEGER DEFAULT 0,
    together_duration_mins INTEGER DEFAULT 0,
    last_voice_join INTEGER,
    last_voice_leave INTEGER,
    partner_present_at_start INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  );

  CREATE TABLE IF NOT EXISTS daily_together_time (
    date TEXT PRIMARY KEY,
    together_mins INTEGER DEFAULT 0,
    qualifies INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
`;

export const DEFAULT_CONFIG = {
  threshold_mins: 60,
  allowed_users: [] as string[],
  topics: ["DSA", "SystemDesign", "Java", "JavaScript", "Databases", "OS", "Networks", "Other"],
  timezone: "Asia/Kolkata",
  together_days: 0,
  last_together_date: null as string | null,
  partners: {} as Record<string, { partnerId: string; partnerName: string }>,
};

export type ConfigKey = keyof typeof DEFAULT_CONFIG;
