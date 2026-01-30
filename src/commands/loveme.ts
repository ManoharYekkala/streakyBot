// src/commands/loveme.ts

import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { generateLoveMessage } from '../services/geminiService';
import { getPartner, setPartner } from '../services/configService';

// Fallback messages when LLM is unavailable (cheesy & flirty!)
const fallbackMessages = [
  {
    title: "You Stole My Heart",
    message: "I didn't believe in love at first sight until I met you, {name}. Now I fall for you every single day.",
    emoji: "💘"
  },
  {
    title: "My Forever Person",
    message: "{name}, you're not just my love - you're my best friend, my soulmate, and my everything. Always and forever.",
    emoji: "💕"
  },
  {
    title: "Butterflies Every Time",
    message: "Even after all this time, {name}, you still give me butterflies. What kind of magic is this?",
    emoji: "🦋💗"
  },
  {
    title: "You're My Dream",
    message: "I used to dream about finding someone like you, {name}. Now I wake up and you're real. Pinch me!",
    emoji: "✨💕"
  },
  {
    title: "Crazy About You",
    message: "{name}, I'm so crazy about you that I smile like an idiot just thinking about your face.",
    emoji: "😍"
  },
  {
    title: "My Heart Is Yours",
    message: "Take good care of my heart, {name}. I left it with you the moment we met.",
    emoji: "💝"
  },
  {
    title: "You Make Me Complete",
    message: "I never knew what was missing until I found you, {name}. You complete me in every way.",
    emoji: "🥰"
  },
  {
    title: "Lucky In Love",
    message: "Out of all the people in the world, I got to call you mine, {name}. I'm the luckiest person alive.",
    emoji: "🍀💕"
  },
  {
    title: "My Sunshine",
    message: "{name}, you're the sunshine that lights up my darkest days. I love you more than words can say.",
    emoji: "☀️💛"
  },
  {
    title: "Falling Deeper",
    message: "Just when I think I can't love you more, {name}, you prove me wrong. I fall deeper every day.",
    emoji: "💓"
  },
  {
    title: "My Happy Place",
    message: "Home isn't a place, {name}. It's wherever you are. You're my happy place.",
    emoji: "🏠💕"
  },
  {
    title: "Can't Stop Smiling",
    message: "You know what's annoying, {name}? I can't stop smiling when I think about you. It's embarrassing!",
    emoji: "😊💗"
  },
  {
    title: "My Heartbeat",
    message: "{name}, my heart doesn't beat - it dances. And it only dances for you.",
    emoji: "💃❤️"
  },
  {
    title: "Love Of My Life",
    message: "I've said 'I love you' a thousand times, {name}, but it still doesn't capture how I feel about you.",
    emoji: "💖"
  },
  {
    title: "Forever Yours",
    message: "In this life and the next, {name}, I choose you. Always you. Only you.",
    emoji: "💍💕"
  }
];

export const lovemeCommandData = new SlashCommandBuilder()
  .setName('loveme')
  .setDescription('Get a cute love message from your partner 💕')
  .addSubcommand((sub) =>
    sub
      .setName('now')
      .setDescription('Get a love message from your partner')
  )
  .addSubcommand((sub) =>
    sub
      .setName('setup')
      .setDescription('Set who your partner is')
      .addUserOption((opt) =>
        opt
          .setName('partner')
          .setDescription('Tag your partner')
          .setRequired(true)
      )
  );

export async function lovemeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'setup') {
    await handleSetup(interaction);
  } else {
    await handleLoveMe(interaction);
  }
}

async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  const partner = interaction.options.getUser('partner', true);
  
  if (partner.id === interaction.user.id) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription("You can't be your own partner, silly! 😅 Tag someone else.")
      ],
      ephemeral: true,
    });
    return;
  }

  if (partner.bot) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription("Bots can't be partners! 🤖 Tag a real human.")
      ],
      ephemeral: true,
    });
    return;
  }

  setPartner(interaction.user.id, interaction.user.displayName, partner.id, partner.displayName);

  const embed = new EmbedBuilder()
    .setColor(Colors.LuminousVividPink)
    .setTitle('💕 Partners Linked!')
    .setDescription(`You and **${partner.displayName}** are now partners!\n\nBoth of you can use \`/loveme now\` to get cute messages from each other. 💕`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleLoveMe(interaction: ChatInputCommandInteraction): Promise<void> {
  const partnerInfo = getPartner(interaction.user.id);

  // First time user - prompt to set up partner
  if (!partnerInfo) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Orange)
      .setTitle('💕 Welcome to LoveMe!')
      .setDescription("Before I can send you love messages, I need to know who your partner is!\n\nUse `/loveme setup @partner` to set your special someone.")
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // Defer reply since LLM might take a moment
  await interaction.deferReply();

  const userName = interaction.user.displayName;
  const partnerName = partnerInfo.partnerName;

  // Try to get a personalized message from LLM
  let loveMessage = await generateLoveMessage(userName, partnerName);
  let isAIGenerated = true;

  // Fallback to static messages if LLM fails
  if (!loveMessage) {
    const fallback = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    loveMessage = {
      title: fallback.title,
      message: fallback.message.replace(/{name}/g, userName),
      emoji: fallback.emoji,
    };
    isAIGenerated = false;
  }

  const embed = new EmbedBuilder()
    .setColor(Colors.LuminousVividPink)
    .setTitle(`${loveMessage.emoji} ${loveMessage.title}`)
    .setDescription(loveMessage.message)
    .setFooter({ 
      text: `From ${partnerName} to ${userName} 💕 • Disappears in 30min` 
    })
    .setTimestamp();

  const reply = await interaction.editReply({ embeds: [embed] });

  // Auto-delete after 30 minutes
  setTimeout(async () => {
    try {
      await reply.delete();
    } catch {
      // Message might already be deleted
    }
  }, 30 * 60 * 1000);
}
