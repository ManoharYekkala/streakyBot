// src/events/voiceStateUpdate.ts

import { Client, Events, VoiceState } from 'discord.js';
import { isUserAllowed, getAllowedUsers } from '../services/configService';
import {
  getActiveSession,
  updateSessionVoiceJoin,
  updateSessionVoiceLeave,
  canResumeSession,
  finalizeSession,
} from '../services/sessionService';
import { checkAndUpdateStreak } from '../services/streakService';
import {
  getTogetherTracking,
  startTogetherTracking,
  removeUserFromTogetherTracking,
  isUserInTogetherTracking,
  checkAndUpdateTogetherDay,
} from '../services/togetherService';
import { minutesSince } from '../utils/timezone';

export function registerVoiceStateEvent(client: Client): void {
  client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
    const userId = newState.id;

    // Only track allowed users
    if (!isUserAllowed(userId)) {
      return;
    }

    const leftChannel = oldState.channelId && !newState.channelId;
    const joinedChannel = !oldState.channelId && newState.channelId;
    const switchedChannel = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

    if (leftChannel || switchedChannel) {
      await handleVoiceLeave(userId, oldState);
    }

    if (joinedChannel || switchedChannel) {
      await handleVoiceJoin(userId, newState);
    }
  });
}

async function handleVoiceLeave(userId: string, oldState: VoiceState): Promise<void> {
  const session = getActiveSession(userId);
  if (!session || session.status !== 'active') {
    return;
  }

  // Calculate time since last voice join
  const elapsedMins = session.last_voice_join ? minutesSince(session.last_voice_join) : 0;

  // Update session with elapsed time
  updateSessionVoiceLeave(session.id, elapsedMins);

  // Handle together time if user was being tracked
  if (isUserInTogetherTracking(userId)) {
    removeUserFromTogetherTracking(userId);
    checkAndUpdateTogetherDay();
  }

  // Check if streak was achieved
  checkAndUpdateStreak(userId);
}

async function handleVoiceJoin(userId: string, newState: VoiceState): Promise<void> {
  const session = getActiveSession(userId);
  if (!session) {
    return;
  }

  // Check if session can be resumed
  if (!canResumeSession(session)) {
    // Session expired, finalize it
    finalizeSession(session.id);
    return;
  }

  // Resume session
  updateSessionVoiceJoin(session.id);

  // Check if partner is in the same channel
  const channelId = newState.channelId;
  if (!channelId) return;

  const channel = newState.channel;
  if (!channel) return;

  const allowedUsers = getAllowedUsers();
  const partnerId = allowedUsers.find((id) => id !== userId);

  if (!partnerId) return;

  // Check if partner is in the same channel with an active session
  const partnerInChannel = channel.members.has(partnerId);
  const partnerSession = partnerInChannel ? getActiveSession(partnerId) : null;

  if (partnerInChannel && partnerSession && partnerSession.status === 'active') {
    // Both users in same channel with active sessions - start together tracking
    const tracking = getTogetherTracking();
    if (!tracking.active) {
      startTogetherTracking(channelId, [userId, partnerId]);
    }
  }
}
