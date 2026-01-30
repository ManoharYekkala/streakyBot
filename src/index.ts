// src/index.ts

import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { initDatabase, closeDatabase } from './db/database';
import { registerReadyEvent } from './events/ready';
import { registerInteractionEvent } from './events/interactionCreate';
import { registerVoiceStateEvent } from './events/voiceStateUpdate';
import { initGemini } from './services/geminiService';

// Load environment variables
config();

const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'GUILD_ID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize database
const dbPath = process.env.DATABASE_PATH || './data/streaky.db';
initDatabase(dbPath);
console.log(`Database initialized at ${dbPath}`);

// Initialize Groq (optional - will use fallback if not configured)
if (initGemini()) {
  console.log('Groq AI initialized for /loveme command');
} else {
  console.log('Groq not configured - /loveme will use fallback messages');
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Register event handlers
registerReadyEvent(client);
registerInteractionEvent(client);
registerVoiceStateEvent(client);

// Login
client.login(process.env.DISCORD_TOKEN);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  closeDatabase();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  closeDatabase();
  client.destroy();
  process.exit(0);
});
