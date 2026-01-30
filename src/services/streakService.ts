import { getConfig } from "../db/database";
import { getTodayIST, getYesterdayIST } from "../utils/timezone";
import { getUser, updateUserStreak } from "./userService";
import { getDailyTotalMins } from "./sessionService";

export interface StreakResult {
  qualified: boolean;
  currentStreak: number;
  bestStreak: number;
  totalStudyDays: number;
  dailyMins: number;
  thresholdMins: number;
  isNewMilestone: boolean;
}

export function checkAndUpdateStreak(userId: string): StreakResult {
  const user = getUser(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const thresholdMins = getConfig("threshold_mins");
  const dailyMins = getDailyTotalMins(userId);
  const today = getTodayIST();
  const yesterday = getYesterdayIST();

  const result: StreakResult = {
    qualified: false,
    currentStreak: user.current_streak,
    bestStreak: user.best_streak,
    totalStudyDays: user.total_study_days,
    dailyMins,
    thresholdMins,
    isNewMilestone: false,
  };

  // Not enough study time yet
  if (dailyMins < thresholdMins) {
    return result;
  }

  // Already counted today
  if (user.last_study_date === today) {
    result.qualified = true;
    return result;
  }

  // Calculate new streak
  let newStreak: number;
  if (user.last_study_date === yesterday) {
    // Consecutive day
    newStreak = user.current_streak + 1;
  } else {
    // First day or streak broken
    newStreak = 1;
  }

  const newBest = Math.max(user.best_streak, newStreak);
  const newTotal = user.total_study_days + 1;

  // Check for milestone (every 7 days)
  const isNewMilestone = newStreak > 0 && newStreak % 7 === 0;

  updateUserStreak(userId, newStreak, newBest, newTotal, today);

  return {
    qualified: true,
    currentStreak: newStreak,
    bestStreak: newBest,
    totalStudyDays: newTotal,
    dailyMins,
    thresholdMins,
    isNewMilestone,
  };
}

export function getStreakStatus(userId: string): {
  currentStreak: number;
  bestStreak: number;
  totalStudyDays: number;
  lastStudyDate: string | null;
} {
  const user = getUser(userId);
  if (!user) {
    return { currentStreak: 0, bestStreak: 0, totalStudyDays: 0, lastStudyDate: null };
  }
  return {
    currentStreak: user.current_streak,
    bestStreak: user.best_streak,
    totalStudyDays: user.total_study_days,
    lastStudyDate: user.last_study_date,
  };
}
