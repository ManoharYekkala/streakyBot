// src/commands/study.ts

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
} from 'discord.js';
import { getOrCreateUser, getUser, getAllUsers } from '../services/userService';
import {
  getActiveSession,
  createSession,
  updateSessionTopics,
  updateSessionVoiceLeave,
  finalizeSession,
  getDailyTotalMins,
  getTodaySessions,
  canResumeSession,
  updateSessionVoiceJoin,
} from '../services/sessionService';
import { checkAndUpdateStreak } from '../services/streakService';
import {
  getTogetherTracking,
  startTogetherTracking,
  getTogetherStats,
  checkAndUpdateTogetherDay,
  getDailyTogetherMins,
} from '../services/togetherService';
import {
  getFullConfig,
  validateTopics,
  getTopics,
  getThresholdMins,
  setThresholdMins,
  addAllowedUser,
  removeAllowedUser,
  getAllowedUsers,
  addTopic,
  removeTopic,
} from '../services/configService';
import {
  sessionStartedEmbed,
  sessionStoppedEmbed,
  statsEmbed,
  todayEmbed,
  leaderboardEmbed,
  configEmbed,
  errorEmbed,
  successEmbed,
  togetherDayEmbed,
} from '../utils/embeds';
import { minutesSince } from '../utils/timezone';
import { getDb } from '../db/database';

export const studyCommandData = new SlashCommandBuilder()
  .setName('study')
  .setDescription('Study session tracking commands')
  .addSubcommand((sub) =>
    sub
      .setName('start')
      .setDescription('Start a study session')
      .addStringOption((opt) =>
        opt
          .setName('topics')
          .setDescription('Topics you are studying (comma-separated)')
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('stop').setDescription('Stop your current study session')
  )
  .addSubcommand((sub) =>
    sub
      .setName('topics')
      .setDescription('Update topics for your current session')
      .addStringOption((opt) =>
        opt
          .setName('topics')
          .setDescription('New topics (comma-separated)')
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('stats')
      .setDescription('View study statistics')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('User to view stats for').setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('today').setDescription("View today's study progress")
  )
  .addSubcommand((sub) =>
    sub.setName('leaderboard').setDescription('View the study leaderboard')
  )
  .addSubcommandGroup((group) =>
    group
      .setName('config')
      .setDescription('Bot configuration')
      .addSubcommand((sub) =>
        sub.setName('view').setDescription('View current configuration')
      )
      .addSubcommand((sub) =>
        sub
          .setName('threshold')
          .setDescription('Set the minimum study time for streak')
          .addIntegerOption((opt) =>
            opt
              .setName('minutes')
              .setDescription('Minimum minutes required')
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(480)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('adduser')
          .setDescription('Add a user to the allowed list')
          .addUserOption((opt) =>
            opt.setName('user').setDescription('User to add').setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('removeuser')
          .setDescription('Remove a user from the allowed list')
          .addUserOption((opt) =>
            opt.setName('user').setDescription('User to remove').setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('addtopic')
          .setDescription('Add a study topic')
          .addStringOption((opt) =>
            opt.setName('topic').setDescription('Topic to add').setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('removetopic')
          .setDescription('Remove a study topic')
          .addStringOption((opt) =>
            opt.setName('topic').setDescription('Topic to remove').setRequired(true)
          )
      )
  );

export async function studyCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  if (subcommandGroup === 'config') {
    await handleConfigCommand(interaction, subcommand);
    return;
  }

  switch (subcommand) {
    case 'start':
      await handleStart(interaction);
      break;
    case 'stop':
      await handleStop(interaction);
      break;
    case 'topics':
      await handleTopics(interaction);
      break;
    case 'stats':
      await handleStats(interaction);
      break;
    case 'today':
      await handleToday(interaction);
      break;
    case 'leaderboard':
      await handleLeaderboard(interaction);
      break;
  }
}

async function handleStart(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({
      embeds: [errorEmbed('Join a voice channel first to start studying!')],
      ephemeral: true,
    });
    return;
  }

  // Parse topics
  const topicsInput = interaction.options.getString('topics');
  let topics: string[] = [];
  let invalidTopics: string[] = [];

  if (topicsInput) {
    const parsed = topicsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const validation = validateTopics(parsed);
    topics = validation.valid;
    invalidTopics = validation.invalid;
  }

  // Get or create user
  getOrCreateUser(interaction.user.id, interaction.user.displayName);

  // Check for existing session
  let session = getActiveSession(interaction.user.id);
  let resumed = false;

  if (session) {
    if (canResumeSession(session)) {
      // Resume existing session
      updateSessionVoiceJoin(session.id);
      if (topics.length > 0) {
        updateSessionTopics(session.id, topics);
      }
      resumed = true;
    } else {
      // Finalize old session and create new one
      finalizeSession(session.id);
      session = null;
    }
  }

  // Check if partner is in the same voice channel
  const allowedUsers = getAllowedUsers();
  const partnerId = allowedUsers.find((id) => id !== interaction.user.id);
  let partnerStarted = false;
  let partnerName: string | undefined;

  if (partnerId && voiceChannel.members.has(partnerId)) {
    const partnerMember = voiceChannel.members.get(partnerId);
    partnerName = partnerMember?.displayName;

    // Create or resume session for partner too
    const partnerSession = getActiveSession(partnerId);

    if (!partnerSession) {
      getOrCreateUser(partnerId, partnerName || 'Partner');
      createSession(partnerId, topics, true);
      partnerStarted = true;
    } else if (canResumeSession(partnerSession)) {
      updateSessionVoiceJoin(partnerSession.id);
      if (topics.length > 0 && partnerSession.topics.length === 0) {
        updateSessionTopics(partnerSession.id, topics);
      }
      partnerStarted = true;
    }

    // Start together tracking if both have active sessions
    const tracking = getTogetherTracking();
    if (!tracking.active) {
      startTogetherTracking(voiceChannel.id, [interaction.user.id, partnerId]);
    }
  }

  // Create session if not resumed
  if (!session && !resumed) {
    session = createSession(interaction.user.id, topics, partnerStarted);
  }

  // Build response
  const embed = sessionStartedEmbed(
    session || getActiveSession(interaction.user.id)!,
    partnerStarted,
    partnerName
  );

  if (resumed) {
    embed.setTitle('Session Resumed!');
  }

  if (invalidTopics.length > 0) {
    embed.addFields({
      name: 'Unknown Topics',
      value: invalidTopics.join(', ') + '\nUse `/study config addtopic <topic>` to add them.',
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleStop(interaction: ChatInputCommandInteraction): Promise<void> {
  const session = getActiveSession(interaction.user.id);

  if (!session) {
    await interaction.reply({
      embeds: [errorEmbed("You don't have an active study session.")],
      ephemeral: true,
    });
    return;
  }

  // Calculate remaining time if still in voice
  const member = interaction.member as GuildMember;
  if (member.voice.channel && session.status === 'active' && session.last_voice_join) {
    const elapsedMins = minutesSince(session.last_voice_join);
    updateSessionVoiceLeave(session.id, elapsedMins);
  }

  // Finalize session
  finalizeSession(session.id);

  // Check streak
  const streakResult = checkAndUpdateStreak(interaction.user.id);

  // Check together day
  const togetherResult = checkAndUpdateTogetherDay();

  const dailyMins = getDailyTotalMins(interaction.user.id);
  const thresholdMins = getThresholdMins();

  const embed = sessionStoppedEmbed(dailyMins, thresholdMins, streakResult);
  await interaction.reply({ embeds: [embed] });

  // Send together day celebration if just achieved
  if (togetherResult.qualified) {
    const togetherEmbed = togetherDayEmbed(togetherResult.togetherDays);
    await interaction.followUp({ embeds: [togetherEmbed] });
  }
}

async function handleTopics(interaction: ChatInputCommandInteraction): Promise<void> {
  const session = getActiveSession(interaction.user.id);

  if (!session) {
    await interaction.reply({
      embeds: [errorEmbed("You don't have an active study session.")],
      ephemeral: true,
    });
    return;
  }

  const topicsInput = interaction.options.getString('topics', true);
  const parsed = topicsInput.split(',').map((t) => t.trim()).filter(Boolean);
  const validation = validateTopics(parsed);

  if (validation.valid.length === 0) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          'No valid topics provided.\nAvailable topics: ' + getTopics().join(', ')
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  updateSessionTopics(session.id, validation.valid);

  let message = 'Topics updated to: ' + validation.valid.join(', ');
  if (validation.invalid.length > 0) {
    message += '\n\nUnknown topics ignored: ' + validation.invalid.join(', ');
  }

  await interaction.reply({ embeds: [successEmbed(message)] });
}

async function handleStats(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const user = getUser(targetUser.id);

  if (!user) {
    await interaction.reply({
      embeds: [errorEmbed('No stats found for this user.')],
      ephemeral: true,
    });
    return;
  }

  const dailyMins = getDailyTotalMins(targetUser.id);
  const thresholdMins = getThresholdMins();
  const togetherStats = getTogetherStats();

  // Get top topics
  const db = getDb();
  const topTopics = db
    .prepare(
      `SELECT json_each.value as topic, COUNT(*) as count
       FROM sessions, json_each(sessions.topics)
       WHERE sessions.user_id = ? AND sessions.status = 'completed'
       GROUP BY json_each.value
       ORDER BY count DESC
       LIMIT 5`
    )
    .all(targetUser.id) as { topic: string; count: number }[];

  const embed = statsEmbed(user, dailyMins, thresholdMins, togetherStats.togetherDays, topTopics);
  await interaction.reply({ embeds: [embed] });
}

async function handleToday(interaction: ChatInputCommandInteraction): Promise<void> {
  const allowedUsers = getAllowedUsers();
  const thresholdMins = getThresholdMins();
  const togetherMins = getDailyTogetherMins();

  const usersData: {
    name: string;
    mins: number;
    qualified: boolean;
    topics: string[];
    active: boolean;
  }[] = [];

  for (const userId of allowedUsers) {
    const user = getUser(userId);
    if (!user) continue;

    const sessions = getTodaySessions(userId);
    const totalMins = sessions.reduce((sum, s) => sum + s.total_duration_mins, 0);
    const activeSession = getActiveSession(userId);
    const allTopics = [...new Set(sessions.flatMap((s) => s.topics))];

    usersData.push({
      name: user.name,
      mins: totalMins,
      qualified: totalMins >= thresholdMins,
      topics: allTopics,
      active: activeSession?.status === 'active',
    });
  }

  if (usersData.length === 0) {
    await interaction.reply({
      embeds: [errorEmbed('No users configured. Use `/study config adduser` to add users.')],
      ephemeral: true,
    });
    return;
  }

  const embed = todayEmbed(usersData, togetherMins, thresholdMins);
  await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  const users = getAllUsers();
  const togetherStats = getTogetherStats();

  if (users.length === 0) {
    await interaction.reply({
      embeds: [errorEmbed('No users have started studying yet.')],
      ephemeral: true,
    });
    return;
  }

  const usersData = users.map((u) => ({
    name: u.name,
    streak: u.current_streak,
    total: u.total_study_days,
  }));

  const embed = leaderboardEmbed(usersData, togetherStats.togetherDays);
  await interaction.reply({ embeds: [embed] });
}

async function handleConfigCommand(
  interaction: ChatInputCommandInteraction,
  subcommand: string
): Promise<void> {
  // Check admin permissions
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      embeds: [errorEmbed('Only server admins can change configuration.')],
      ephemeral: true,
    });
    return;
  }

  switch (subcommand) {
    case 'view': {
      const config = getFullConfig();
      await interaction.reply({ embeds: [configEmbed(config)] });
      break;
    }
    case 'threshold': {
      const mins = interaction.options.getInteger('minutes', true);
      setThresholdMins(mins);
      await interaction.reply({
        embeds: [successEmbed('Study threshold updated to ' + mins + ' minutes.')],
      });
      break;
    }
    case 'adduser': {
      const user = interaction.options.getUser('user', true);
      addAllowedUser(user.id);
      await interaction.reply({
        embeds: [successEmbed('Added ' + user.displayName + ' to allowed users.')],
      });
      break;
    }
    case 'removeuser': {
      const user = interaction.options.getUser('user', true);
      const removed = removeAllowedUser(user.id);
      if (removed) {
        await interaction.reply({
          embeds: [successEmbed('Removed ' + user.displayName + ' from allowed users.')],
        });
      } else {
        await interaction.reply({
          embeds: [errorEmbed(user.displayName + ' was not in the allowed list.')],
          ephemeral: true,
        });
      }
      break;
    }
    case 'addtopic': {
      const topic = interaction.options.getString('topic', true);
      addTopic(topic);
      await interaction.reply({
        embeds: [successEmbed("Added '" + topic + "' to topics.")],
      });
      break;
    }
    case 'removetopic': {
      const topic = interaction.options.getString('topic', true);
      const removed = removeTopic(topic);
      if (removed) {
        await interaction.reply({
          embeds: [successEmbed("Removed '" + topic + "' from topics.")],
        });
      } else {
        await interaction.reply({
          embeds: [errorEmbed("Topic '" + topic + "' not found.")],
          ephemeral: true,
        });
      }
      break;
    }
  }
}
