// src/deploy-commands.ts

import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { getCommandsData } from './commands';

config();

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.GUILD_ID!;

if (!token || !clientId || !guildId) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const rest = new REST().setToken(token);

async function deployCommands(): Promise<void> {
  try {
    console.log('Started refreshing application (/) commands.');

    const commandsData = getCommandsData().map((cmd) => cmd.toJSON());

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commandsData,
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands();
