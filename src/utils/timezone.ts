import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { subDays, differenceInMinutes } from "date-fns";
import { getConfig } from "../db/database";

export function getTimezone(): string {
  return getConfig("timezone");
}

export function getTodayIST(): string {
  const tz = getTimezone();
  return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
}

export function getYesterdayIST(): string {
  const tz = getTimezone();
  const now = new Date();
  const yesterday = subDays(now, 1);
  return formatInTimeZone(yesterday, tz, "yyyy-MM-dd");
}

export function getCurrentTimeIST(): string {
  const tz = getTimezone();
  return formatInTimeZone(new Date(), tz, "HH:mm:ss");
}

export function getTimestampNow(): number {
  return Math.floor(Date.now() / 1000);
}

export function minutesSince(timestamp: number): number {
  const now = Date.now();
  const then = timestamp * 1000;
  return Math.floor((now - then) / (1000 * 60));
}

export function formatDuration(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours === 0) {
    return `${minutes} min${minutes !== 1 ? "s" : ""}`;
  }
  if (minutes === 0) {
    return `${hours} hr${hours !== 1 ? "s" : ""}`;
  }
  return `${hours}hr ${minutes}min`;
}
