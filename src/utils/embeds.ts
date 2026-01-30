import { EmbedBuilder, Colors } from "discord.js";
import { formatDuration } from "./timezone";
import { User } from "../services/userService";
import { Session } from "../services/sessionService";

export function sessionStartedEmbed(
  session: Session,
  partnerStarted: boolean,
  partnerName?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle("Study Session Started!")
    .setDescription(
      partnerStarted
        ? `Started for both of you! Couple study mode activated`
        : "You're studying solo today - let's go!",
    )
    .setTimestamp();

  if (session.topics.length > 0) {
    embed.addFields({ name: "Topics", value: session.topics.join(", "), inline: true });
  }

  return embed;
}

export function sessionStoppedEmbed(
  dailyMins: number,
  thresholdMins: number,
  streakResult: {
    qualified: boolean;
    currentStreak: number;
    bestStreak: number;
    isNewMilestone: boolean;
  },
): EmbedBuilder {
  const remaining = thresholdMins - dailyMins;
  const qualified = dailyMins >= thresholdMins;

  const embed = new EmbedBuilder().setTimestamp();

  if (qualified) {
    embed
      .setColor(Colors.Gold)
      .setTitle("Session Ended!")
      .setDescription(
        `Great work! You studied **${formatDuration(dailyMins)}** today.\nStreak: **${streakResult.currentStreak} days**`,
      );

    if (streakResult.isNewMilestone) {
      embed.addFields({
        name: "MILESTONE!",
        value: `${streakResult.currentStreak} days in a row! You're building something great.`,
      });
    }
  } else {
    embed
      .setColor(Colors.Blue)
      .setTitle("Session Paused")
      .setDescription(
        `You've studied **${formatDuration(dailyMins)}** today.\nNeed **${formatDuration(remaining)}** more for your streak!`,
      );
  }

  return embed;
}

export function statsEmbed(
  user: User,
  dailyMins: number,
  thresholdMins: number,
  togetherDays: number,
  topTopics: { topic: string; count: number }[],
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Purple)
    .setTitle(`${user.name}'s Study Stats`)
    .addFields(
      { name: "Current Streak", value: `${user.current_streak} days`, inline: true },
      { name: "Best Streak", value: `${user.best_streak} days`, inline: true },
      { name: "Total Study Days", value: `${user.total_study_days}`, inline: true },
      { name: "Together Days", value: `${togetherDays}`, inline: true },
      {
        name: "Today",
        value: `${formatDuration(dailyMins)} / ${formatDuration(thresholdMins)}`,
        inline: true,
      },
    )
    .setTimestamp();

  if (topTopics.length > 0) {
    const topicsStr = topTopics
      .slice(0, 5)
      .map((t) => `${t.topic}: ${t.count} days`)
      .join("\n");
    embed.addFields({ name: "Top Topics", value: topicsStr });
  }

  return embed;
}

export function todayEmbed(
  users: {
    name: string;
    mins: number;
    qualified: boolean;
    topics: string[];
    active: boolean;
  }[],
  togetherMins: number,
  thresholdMins: number,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle("Today's Study Progress")
    .setTimestamp();

  for (const user of users) {
    const status = user.active ? "(studying now)" : user.qualified ? "" : "(needs more time)";
    const checkmark = user.qualified ? "" : "";
    embed.addFields({
      name: `${checkmark} ${user.name} ${status}`,
      value: `Time: ${formatDuration(user.mins)}\nTopics: ${user.topics.length > 0 ? user.topics.join(", ") : "None"}`,
      inline: true,
    });
  }

  const togetherQualified = togetherMins >= thresholdMins;
  embed.addFields({
    name: `${togetherQualified ? "" : ""} Together Time`,
    value: `${formatDuration(togetherMins)} / ${formatDuration(thresholdMins)}`,
  });

  return embed;
}

export function leaderboardEmbed(
  users: { name: string; streak: number; total: number }[],
  togetherDays: number,
): EmbedBuilder {
  const sorted = [...users].sort((a, b) => b.streak - a.streak);

  const embed = new EmbedBuilder()
    .setColor(Colors.Gold)
    .setTitle("Study Leaderboard")
    .setTimestamp();

  for (let i = 0; i < sorted.length; i++) {
    const medal = i === 0 ? "" : "";
    embed.addFields({
      name: `${medal} ${sorted[i].name}`,
      value: `Streak: ${sorted[i].streak} days\nTotal: ${sorted[i].total} days`,
      inline: true,
    });
  }

  embed.addFields({
    name: "Together Days",
    value: `${togetherDays}`,
  });

  return embed;
}

export function configEmbed(config: {
  threshold_mins: number;
  allowed_users: string[];
  topics: string[];
  timezone: string;
  together_days: number;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.Grey)
    .setTitle("Bot Configuration")
    .addFields(
      { name: "Study Threshold", value: `${config.threshold_mins} mins`, inline: true },
      { name: "Timezone", value: config.timezone, inline: true },
      { name: "Together Days", value: `${config.together_days}`, inline: true },
      {
        name: "Allowed Users",
        value:
          config.allowed_users.length > 0
            ? config.allowed_users.map((u) => `<@${u}>`).join(", ")
            : "Everyone (not configured)",
      },
      { name: "Topics", value: config.topics.join(", ") },
    )
    .setTimestamp();
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(Colors.Red).setDescription(message);
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(Colors.Green).setDescription(message);
}

export function togetherDayEmbed(togetherDays: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.Gold)
    .setTitle("POWER COUPLE MOMENT")
    .setDescription(`You both studied 1hr+ together today!\nTogether days: **${togetherDays}**`)
    .setTimestamp();
}
