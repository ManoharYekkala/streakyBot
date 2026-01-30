import { getDb } from "../db/database";

export interface User {
  user_id: string;
  name: string;
  current_streak: number;
  best_streak: number;
  total_study_days: number;
  last_study_date: string | null;
}

export function getUser(userId: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId) as User | undefined;
  return row || null;
}

export function createUser(userId: string, name: string): User {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO users (user_id, name, current_streak, best_streak, total_study_days) VALUES (?, ?, 0, 0, 0)",
  ).run(userId, name);
  return getUser(userId)!;
}

export function getOrCreateUser(userId: string, name: string): User {
  const existing = getUser(userId);
  if (existing) {
    return existing;
  }
  return createUser(userId, name);
}

export function updateUserStreak(
  userId: string,
  currentStreak: number,
  bestStreak: number,
  totalStudyDays: number,
  lastStudyDate: string,
): void {
  const db = getDb();
  db.prepare(
    `UPDATE users
     SET current_streak = ?, best_streak = ?, total_study_days = ?, last_study_date = ?
     WHERE user_id = ?`,
  ).run(currentStreak, bestStreak, totalStudyDays, lastStudyDate, userId);
}

export function getAllUsers(): User[] {
  const db = getDb();
  return db.prepare("SELECT * FROM users").all() as User[];
}
