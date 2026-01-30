// src/commands/countdown.ts

import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { getConfig, setConfig } from '../db/database';
import { formatInTimeZone } from 'date-fns-tz';
import { differenceInDays, differenceInHours, differenceInMinutes, isPast, isToday, parseISO, startOfDay } from 'date-fns';

interface CountdownEvent {
  id: string;
  name: string;
  date: string; // ISO date string YYYY-MM-DD
  emoji: string;
  createdBy: string;
  recurring: boolean; // For anniversaries that repeat yearly
}

interface CountdownsConfig {
  events: CountdownEvent[];
}

// Celebratory messages for when an event arrives
const celebrationMessages = [
  "The day has finally arrived!",
  "Today's the day! Time to celebrate!",
  "It's here! Have an amazing time!",
  "The wait is over - enjoy every moment!",
  "Happy special day to you both!",
];

// Default emoji options for events
const defaultEmojis: Record<string, string> = {
  anniversary: "💕",
  birthday: "🎂",
  date: "💑",
  trip: "✈️",
  movie: "🎬",
  dinner: "🍽️",
  default: "📅",
};

export const countdownCommandData = new SlashCommandBuilder()
  .setName('countdown')
  .setDescription('Track countdowns to special events and dates')
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Add a new countdown')
      .addStringOption((opt) =>
        opt
          .setName('name')
          .setDescription('Name of the event (e.g., "Our Anniversary", "Beach Trip")')
          .setRequired(true)
          .setMaxLength(50)
      )
      .addStringOption((opt) =>
        opt
          .setName('date')
          .setDescription('Date of the event (YYYY-MM-DD format, e.g., 2025-02-14)')
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName('emoji')
          .setDescription('Emoji for the event (default: 📅)')
          .setRequired(false)
      )
      .addBooleanOption((opt) =>
        opt
          .setName('recurring')
          .setDescription('Does this event repeat yearly? (e.g., anniversaries)')
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('List all your countdowns')
  )
  .addSubcommand((sub) =>
    sub
      .setName('view')
      .setDescription('View details of a specific countdown')
      .addStringOption((opt) =>
        opt
          .setName('name')
          .setDescription('Name of the countdown to view')
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Remove a countdown')
      .addStringOption((opt) =>
        opt
          .setName('name')
          .setDescription('Name of the countdown to remove')
          .setRequired(true)
          .setAutocomplete(true)
      )
  );

export async function countdownCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'add':
      await handleAdd(interaction);
      break;
    case 'list':
      await handleList(interaction);
      break;
    case 'view':
      await handleView(interaction);
      break;
    case 'remove':
      await handleRemove(interaction);
      break;
  }
}

// Helper to get countdowns from config
function getCountdowns(): CountdownsConfig {
  const config = getConfig('countdowns') as CountdownsConfig | null;
  return config || { events: [] };
}

// Helper to save countdowns to config
function saveCountdowns(config: CountdownsConfig): void {
  setConfig('countdowns', config);
}

// Calculate the next occurrence of a recurring event
function getNextOccurrence(dateStr: string, recurring: boolean): Date {
  const eventDate = parseISO(dateStr);
  const now = new Date();

  if (!recurring) {
    return eventDate;
  }

  // For recurring events, find the next occurrence
  const thisYear = now.getFullYear();
  let nextDate = new Date(thisYear, eventDate.getMonth(), eventDate.getDate());

  // If this year's date has passed, use next year
  if (isPast(nextDate) && !isToday(nextDate)) {
    nextDate = new Date(thisYear + 1, eventDate.getMonth(), eventDate.getDate());
  }

  return nextDate;
}

// Format the countdown display
function formatCountdown(targetDate: Date): { text: string; isPast: boolean; isToday: boolean } {
  const now = new Date();

  if (isToday(targetDate)) {
    return { text: "TODAY!", isPast: false, isToday: true };
  }

  if (isPast(targetDate)) {
    const daysAgo = Math.abs(differenceInDays(targetDate, now));
    return { text: `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`, isPast: true, isToday: false };
  }

  const days = differenceInDays(targetDate, startOfDay(now));
  const hours = differenceInHours(targetDate, now) % 24;

  if (days === 0) {
    return { text: `${hours} hour${hours !== 1 ? 's' : ''} left!`, isPast: false, isToday: false };
  }

  if (days === 1) {
    return { text: "Tomorrow!", isPast: false, isToday: false };
  }

  if (days < 7) {
    return { text: `${days} days`, isPast: false, isToday: false };
  }

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) {
      return { text: `${weeks} week${weeks !== 1 ? 's' : ''}`, isPast: false, isToday: false };
    }
    return { text: `${weeks}w ${remainingDays}d`, isPast: false, isToday: false };
  }

  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  if (remainingDays === 0) {
    return { text: `${months} month${months !== 1 ? 's' : ''}`, isPast: false, isToday: false };
  }
  return { text: `${months}mo ${remainingDays}d`, isPast: false, isToday: false };
}

async function handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString('name', true).trim();
  const dateStr = interaction.options.getString('date', true).trim();
  const emoji = interaction.options.getString('emoji')?.trim() || defaultEmojis.default;
  const recurring = interaction.options.getBoolean('recurring') || false;

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription("Invalid date format! Please use YYYY-MM-DD (e.g., 2025-02-14)")
      ],
      ephemeral: true,
    });
    return;
  }

  // Parse and validate the date
  const parsedDate = parseISO(dateStr);
  if (isNaN(parsedDate.getTime())) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription("Invalid date! Please check the date values.")
      ],
      ephemeral: true,
    });
    return;
  }

  // Check for past dates (only for non-recurring)
  if (!recurring && isPast(parsedDate) && !isToday(parsedDate)) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription("That date is in the past! Use `recurring: true` for anniversaries, or pick a future date.")
      ],
      ephemeral: true,
    });
    return;
  }

  const countdowns = getCountdowns();

  // Check for duplicate names
  if (countdowns.events.some(e => e.name.toLowerCase() === name.toLowerCase())) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(`A countdown named "${name}" already exists! Use a different name or remove the existing one first.`)
      ],
      ephemeral: true,
    });
    return;
  }

  // Create the new event
  const newEvent: CountdownEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    date: dateStr,
    emoji,
    createdBy: interaction.user.id,
    recurring,
  };

  countdowns.events.push(newEvent);
  saveCountdowns(countdowns);

  // Calculate countdown for response
  const nextDate = getNextOccurrence(dateStr, recurring);
  const countdown = formatCountdown(nextDate);
  const formattedDate = formatInTimeZone(nextDate, 'UTC', 'MMMM d, yyyy');

  const embed = new EmbedBuilder()
    .setColor(Colors.LuminousVividPink)
    .setTitle(`${emoji} Countdown Added!`)
    .setDescription(`**${name}**\n\n📅 ${formattedDate}\n⏳ ${countdown.text}`)
    .setFooter({ text: recurring ? '🔄 Repeats yearly' : 'One-time event' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const countdowns = getCountdowns();

  if (countdowns.events.length === 0) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle("📅 No Countdowns Yet")
        .setDescription("You don't have any countdowns!\n\nAdd one with `/countdown add`\n\nIdeas:\n• Your anniversary 💕\n• Next date night 💑\n• Upcoming trip ✈️\n• Special birthdays 🎂")
      ],
      ephemeral: true,
    });
    return;
  }

  // Sort events by next occurrence date
  const sortedEvents = [...countdowns.events].sort((a, b) => {
    const dateA = getNextOccurrence(a.date, a.recurring);
    const dateB = getNextOccurrence(b.date, b.recurring);
    return dateA.getTime() - dateB.getTime();
  });

  const embed = new EmbedBuilder()
    .setColor(Colors.LuminousVividPink)
    .setTitle("📅 Your Countdowns")
    .setTimestamp();

  const lines: string[] = [];

  for (const event of sortedEvents) {
    const nextDate = getNextOccurrence(event.date, event.recurring);
    const countdown = formatCountdown(nextDate);
    const formattedDate = formatInTimeZone(nextDate, 'UTC', 'MMM d, yyyy');

    let statusIcon = '';
    if (countdown.isToday) {
      statusIcon = '🎉 ';
    } else if (countdown.isPast) {
      statusIcon = '✓ ';
    }

    const recurringIcon = event.recurring ? ' 🔄' : '';
    lines.push(`${statusIcon}${event.emoji} **${event.name}**${recurringIcon}\n   ${formattedDate} • ${countdown.text}`);
  }

  embed.setDescription(lines.join('\n\n'));

  await interaction.reply({ embeds: [embed] });
}

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString('name', true).trim();
  const countdowns = getCountdowns();

  const event = countdowns.events.find(e => e.name.toLowerCase() === name.toLowerCase());

  if (!event) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(`No countdown found with name "${name}".\n\nUse \`/countdown list\` to see all your countdowns.`)
      ],
      ephemeral: true,
    });
    return;
  }

  const nextDate = getNextOccurrence(event.date, event.recurring);
  const countdown = formatCountdown(nextDate);
  const formattedDate = formatInTimeZone(nextDate, 'UTC', 'EEEE, MMMM d, yyyy');
  const originalDate = formatInTimeZone(parseISO(event.date), 'UTC', 'MMMM d, yyyy');

  const embed = new EmbedBuilder()
    .setColor(countdown.isToday ? Colors.Gold : Colors.LuminousVividPink)
    .setTitle(`${event.emoji} ${event.name}`)
    .setTimestamp();

  if (countdown.isToday) {
    const celebrationMsg = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
    embed.setDescription(`# 🎉 ${countdown.text}\n\n${celebrationMsg}`);
  } else {
    // Create a visual countdown
    const daysLeft = differenceInDays(nextDate, startOfDay(new Date()));
    let progressText = '';

    if (daysLeft > 0 && daysLeft <= 30) {
      // Show a visual progress indicator for close events
      const filled = Math.max(0, 30 - daysLeft);
      const empty = daysLeft;
      progressText = '\n\n' + '▓'.repeat(Math.min(filled, 30)) + '░'.repeat(Math.min(empty, 30));
    }

    embed.setDescription(`**${formattedDate}**\n\n⏳ **${countdown.text}**${progressText}`);
  }

  embed.addFields(
    { name: 'Type', value: event.recurring ? '🔄 Recurring (yearly)' : '📌 One-time', inline: true }
  );

  if (event.recurring) {
    embed.addFields(
      { name: 'Original Date', value: originalDate, inline: true }
    );
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString('name', true).trim();
  const countdowns = getCountdowns();

  const eventIndex = countdowns.events.findIndex(e => e.name.toLowerCase() === name.toLowerCase());

  if (eventIndex === -1) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(`No countdown found with name "${name}".\n\nUse \`/countdown list\` to see all your countdowns.`)
      ],
      ephemeral: true,
    });
    return;
  }

  const removed = countdowns.events.splice(eventIndex, 1)[0];
  saveCountdowns(countdowns);

  const embed = new EmbedBuilder()
    .setColor(Colors.Grey)
    .setDescription(`${removed.emoji} **${removed.name}** has been removed.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Export for autocomplete handling
export function getCountdownNames(): string[] {
  const countdowns = getCountdowns();
  return countdowns.events.map(e => e.name);
}
