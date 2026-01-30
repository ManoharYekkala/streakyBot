import { getDb } from "../db/database";
import { getTodayIST, getTimestampNow, minutesSince } from "../utils/timezone";

export interface Session {
  id: number;
  user_id: string;
  date: string;
  status: "active" | "paused" | "completed";
  topics: string[];
  started_at: number;
  total_duration_mins: number;
  together_duration_mins: number;
  last_voice_join: number | null;
  last_voice_leave: number | null;
  partner_present_at_start: boolean;
}

interface SessionRow {
  id: number;
  user_id: string;
  date: string;
  status: string;
  topics: string;
  started_at: number;
  total_duration_mins: number;
  together_duration_mins: number;
  last_voice_join: number | null;
  last_voice_leave: number | null;
  partner_present_at_start: number;
}

function rowToSession(row: SessionRow): Session {
  return {
    ...row,
    status: row.status as Session["status"],
    topics: JSON.parse(row.topics),
    partner_present_at_start: Boolean(row.partner_present_at_start),
  };
}

export function getActiveSession(userId: string): Session | null {
  const db = getDb();
  const today = getTodayIST();
  const row = db
    .prepare(
      "SELECT * FROM sessions WHERE user_id = ? AND date = ? AND status IN ('active', 'paused') ORDER BY id DESC LIMIT 1",
    )
    .get(userId, today) as SessionRow | undefined;
  return row ? rowToSession(row) : null;
}

export function getTodaySessions(userId: string): Session[] {
  const db = getDb();
  const today = getTodayIST();
  const rows = db
    .prepare("SELECT * FROM sessions WHERE user_id = ? AND date = ?")
    .all(userId, today) as SessionRow[];
  return rows.map(rowToSession);
}

export function getDailyTotalMins(userId: string): number {
  const sessions = getTodaySessions(userId);
  return sessions.reduce((sum, s) => sum + s.total_duration_mins, 0);
}

export function createSession(userId: string, topics: string[], partnerPresent: boolean): Session {
  const db = getDb();
  const now = getTimestampNow();
  const today = getTodayIST();

  const result = db
    .prepare(
      `INSERT INTO sessions
       (user_id, date, status, topics, started_at, total_duration_mins, together_duration_mins, last_voice_join, partner_present_at_start)
       VALUES (?, ?, 'active', ?, ?, 0, 0, ?, ?)`,
    )
    .run(userId, today, JSON.stringify(topics), now, now, partnerPresent ? 1 : 0);

  return getSessionById(result.lastInsertRowid as number)!;
}

export function getSessionById(id: number): Session | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
  return row ? rowToSession(row) : null;
}

export function updateSessionStatus(sessionId: number, status: Session["status"]): void {
  const db = getDb();
  db.prepare("UPDATE sessions SET status = ? WHERE id = ?").run(status, sessionId);
}

export function updateSessionVoiceJoin(sessionId: number): void {
  const db = getDb();
  const now = getTimestampNow();
  db.prepare("UPDATE sessions SET last_voice_join = ?, status = ? WHERE id = ?").run(
    now,
    "active",
    sessionId,
  );
}

export function updateSessionVoiceLeave(sessionId: number, additionalMins: number): void {
  const db = getDb();
  const now = getTimestampNow();
  db.prepare(
    `UPDATE sessions
     SET last_voice_leave = ?,
         total_duration_mins = total_duration_mins + ?,
         status = 'paused'
     WHERE id = ?`,
  ).run(now, additionalMins, sessionId);
}

export function addTogetherTime(sessionId: number, mins: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE sessions SET together_duration_mins = together_duration_mins + ? WHERE id = ?",
  ).run(mins, sessionId);
}

export function updateSessionTopics(sessionId: number, topics: string[]): void {
  const db = getDb();
  db.prepare("UPDATE sessions SET topics = ? WHERE id = ?").run(JSON.stringify(topics), sessionId);
}

export function finalizeSession(sessionId: number): Session {
  const db = getDb();
  db.prepare("UPDATE sessions SET status = 'completed' WHERE id = ?").run(sessionId);
  return getSessionById(sessionId)!;
}

export function canResumeSession(session: Session): boolean {
  if (session.status !== "paused" || !session.last_voice_leave) {
    return session.status === "active";
  }
  const minsSinceLeave = minutesSince(session.last_voice_leave);
  return minsSinceLeave < 60;
}

export function getAllActiveSessions(): Session[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM sessions WHERE status IN ('active', 'paused')")
    .all() as SessionRow[];
  return rows.map(rowToSession);
}
