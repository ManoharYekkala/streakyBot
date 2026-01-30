import { getConfig, setConfig } from "../db/database";

export function getThresholdMins(): number {
  return getConfig("threshold_mins");
}

export function setThresholdMins(mins: number): void {
  setConfig("threshold_mins", mins);
}

export function getAllowedUsers(): string[] {
  return getConfig("allowed_users");
}

export function addAllowedUser(userId: string): void {
  const users = getAllowedUsers();
  if (!users.includes(userId)) {
    users.push(userId);
    setConfig("allowed_users", users);
  }
}

export function removeAllowedUser(userId: string): boolean {
  const users = getAllowedUsers();
  const idx = users.indexOf(userId);
  if (idx === -1) {
    return false;
  }
  users.splice(idx, 1);
  setConfig("allowed_users", users);
  return true;
}

export function isUserAllowed(userId: string): boolean {
  const users = getAllowedUsers();
  // If no users configured, allow all (initial setup)
  if (users.length === 0) {
    return true;
  }
  return users.includes(userId);
}

export function getTopics(): string[] {
  return getConfig("topics");
}

export function addTopic(topic: string): void {
  const topics = getTopics();
  const normalized = topic.trim();
  if (!topics.some((t) => t.toLowerCase() === normalized.toLowerCase())) {
    topics.push(normalized);
    setConfig("topics", topics);
  }
}

export function removeTopic(topic: string): boolean {
  const topics = getTopics();
  const idx = topics.findIndex((t) => t.toLowerCase() === topic.toLowerCase());
  if (idx === -1) {
    return false;
  }
  topics.splice(idx, 1);
  setConfig("topics", topics);
  return true;
}

export function isValidTopic(topic: string): boolean {
  const topics = getTopics();
  return topics.some((t) => t.toLowerCase() === topic.toLowerCase());
}

export function validateTopics(inputTopics: string[]): { valid: string[]; invalid: string[] } {
  const validTopics = getTopics();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const topic of inputTopics) {
    const match = validTopics.find((t) => t.toLowerCase() === topic.trim().toLowerCase());
    if (match) {
      valid.push(match);
    } else {
      invalid.push(topic.trim());
    }
  }

  return { valid, invalid };
}

export function getFullConfig(): {
  threshold_mins: number;
  allowed_users: string[];
  topics: string[];
  timezone: string;
  together_days: number;
} {
  return {
    threshold_mins: getConfig("threshold_mins"),
    allowed_users: getConfig("allowed_users"),
    topics: getConfig("topics"),
    timezone: getConfig("timezone"),
    together_days: getConfig("together_days"),
  };
}

// Partner configuration for /loveme (one-to-one mutual)
interface PartnerConfig {
  [userId: string]: { partnerId: string; partnerName: string };
}

export function getPartners(): PartnerConfig {
  return getConfig("partners") || {};
}

export function setPartner(
  userId: string,
  userName: string,
  partnerId: string,
  partnerName: string
): void {
  const partners = getPartners();
  // Set both ways - mutual partnership
  partners[userId] = { partnerId, partnerName };
  partners[partnerId] = { partnerId: userId, partnerName: userName };
  setConfig("partners", partners);
}

export function getPartner(userId: string): { partnerId: string; partnerName: string } | null {
  const partners = getPartners();
  return partners[userId] || null;
}
