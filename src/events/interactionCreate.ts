// src/events/interactionCreate.ts

import { Client, Events, Interaction, ChatInputCommandInteraction } from 'discord.js';
import { commands } from '../commands';
import { isUserAllowed } from '../services/configService';
import { errorEmbed } from '../utils/embeds';

export function registerInteractionEvent(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    await handleCommand(interaction);
  });
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = commands.get(interaction.commandName);

  if (!command) {
    await interaction.reply({
      embeds: [errorEmbed('Unknown command.')],
      ephemeral: true,
    });
    return;
  }

  // Check if user is allowed (skip for config commands by admins)
  const isConfigCommand = interaction.commandName === 'study' &&
    interaction.options.getSubcommandGroup(false) === 'config';

  if (!isConfigCommand && !isUserAllowed(interaction.user.id)) {
    await interaction.reply({
      embeds: [errorEmbed('This bot is configured for specific users only.')],
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    const reply = {
      embeds: [errorEmbed('There was an error executing this command.')],
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
