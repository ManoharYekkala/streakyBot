
import { getDb, getConfig, setConfig } from '../db/database';
import { getTodayIST, getTimestampNow, minutesSince } from '../utils/timezone';
import { addTogetherTime, getActiveSession } from './sessionService';

interface TogetherTracking {
  active: boolean;
  startedAt: number | null;
  channelId: string | null;
  userIds: string[];
}

// In-memory tracking for together time
let togetherTracking: TogetherTracking = {
  active: false,
  startedAt: null,
  channelId: null,
  userIds: [],
};

export function getTogetherTracking(): TogetherTracking {
  return { ...togetherTracking };
}

export function startTogetherTracking(channelId: string, userIds: string[]): void {
  togetherTracking = {
    active: true,
    startedAt: getTimestampNow(),
    channelId,
    userIds: [...userIds],
  };
}

export function stopTogetherTracking(): number {
  if (!togetherTracking.active || !togetherTracking.startedAt) {
    return 0;
  }

  const elapsedMins = minutesSince(togetherTracking.startedAt);

  // Add together time to daily total
  const today = getTodayIST();
  const db = getDb();

  db.prepare(
    `INSERT INTO daily_together_time (date, together_mins, qualifies)
     VALUES (?, ?, 0)
     ON CONFLICT(date) DO UPDATE SET together_mins = together_mins + ?`
  ).run(today, elapsedMins, elapsedMins);

  // Add to both users' active sessions
  for (const userId of togetherTracking.userIds) {
    const session = getActiveSession(userId);
    if (session) {
      addTogetherTime(session.id, elapsedMins);
    }
  }

  // Reset tracking
  togetherTracking = {
    active: false,
    startedAt: null,
    channelId: null,
    userIds: [],
  };

  return elapsedMins;
}

export function getDailyTogetherMins(): number {
  const db = getDb();
  const today = getTodayIST();
  const row = db
    .prepare('SELECT together_mins FROM daily_together_time WHERE date = ?')
    .get(today) as { together_mins: number } | undefined;
  return row?.together_mins || 0;
}

export function checkAndUpdateTogetherDay(): { qualified: boolean; togetherDays: number } {
  const thresholdMins = getConfig('threshold_mins');
  const togetherMins = getDailyTogetherMins();
  const today = getTodayIST();
  const lastTogetherDate = getConfig('last_together_date');

  if (togetherMins < thresholdMins) {
    return { qualified: false, togetherDays: getConfig('together_days') };
  }

  // Already counted today
  if (lastTogetherDate === today) {
    return { qualified: true, togetherDays: getConfig('together_days') };
  }

  // Update together day count
  const db = getDb();
  db.prepare('UPDATE daily_together_time SET qualifies = 1 WHERE date = ?').run(today);

  const newTogetherDays = getConfig('together_days') + 1;
  setConfig('together_days', newTogetherDays);
  setConfig('last_together_date', today);

  return { qualified: true, togetherDays: newTogetherDays };
}

export function getTogetherStats(): { togetherDays: number; todayMins: number } {
  return {
    togetherDays: getConfig('together_days'),
    todayMins: getDailyTogetherMins(),
  };
}

export function isUserInTogetherTracking(userId: string): boolean {
  return togetherTracking.active && togetherTracking.userIds.includes(userId);
}

export function removeUserFromTogetherTracking(userId: string): number {
  if (!togetherTracking.active) {
    return 0;
  }

  const idx = togetherTracking.userIds.indexOf(userId);
  if (idx === -1) {
    return 0;
  }

  // If only 2 users and one leaves, stop tracking
  if (togetherTracking.userIds.length <= 2) {
    return stopTogetherTracking();
  }

  // Otherwise just remove the user
  togetherTracking.userIds.splice(idx, 1);
  return 0;
}
