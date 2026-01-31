// src/commands/index.ts

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { studyCommand, studyCommandData } from './study';
import { lovemeCommand, lovemeCommandData } from './loveme';
import { countdownCommand, countdownCommandData } from './countdown';

type CommandData = SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  data: CommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands = new Map<string, Command>();

// Register commands
commands.set(studyCommandData.name, {
  data: studyCommandData,
  execute: studyCommand,
});

commands.set(lovemeCommandData.name, {
  data: lovemeCommandData,
  execute: lovemeCommand,
});

commands.set(countdownCommandData.name, {
  data: countdownCommandData,
  execute: countdownCommand,
});

export function getCommandsData(): CommandData[] {
  return Array.from(commands.values()).map((cmd) => cmd.data);
}
