# StreakyBot

A Discord bot for tracking study sessions via voice channel presence, maintaining streaks, and gamifying accountability.

## Features

- **Voice-based tracking**: Study time is tracked when you're in a voice channel
- **Streak system**: Maintain consecutive study days (requires 60+ mins/day)
- **Couple mode**: Track study sessions together with your partner
- **Configurable**: Adjust settings via slash commands

## Setup

### Prerequisites

- Node.js 20+
- A Discord bot application

### Getting Discord Credentials

1. **Create a Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Copy the **Application ID** - this is your `DISCORD_CLIENT_ID`

2. **Create the Bot**
   - Go to the "Bot" tab in your application
   - Click "Add Bot"
   - Click "Reset Token" to generate a new token
   - Copy the token - this is your `DISCORD_TOKEN`
   - **Enable these Privileged Gateway Intents:**
     - Server Members Intent (optional)
     - Message Content Intent (optional)

3. **Get Your Guild (Server) ID**
   - Open Discord and go to Settings > Advanced > Enable "Developer Mode"
   - Right-click on your server name in the sidebar
   - Click "Copy Server ID" - this is your `GUILD_ID`

4. **Invite the Bot to Your Server**
   - Go to "OAuth2" > "URL Generator" in the Developer Portal
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Send Messages`, `Embed Links`, `Connect` (voice)
   - Copy the generated URL and open it in your browser
   - Select your server and authorize

### Getting Groq API Key (Optional - for AI love messages)

1. Go to [Groq Console](https://console.groq.com/keys)
2. Sign up/login and click "Create API Key"
3. Copy the key - this is your `GROQ_API_KEY`

> **Note:** Groq is super fast and has a generous free tier. Without this key, `/loveme` will use pre-written messages instead of AI-generated ones.

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```env
   DISCORD_TOKEN=your_bot_token_from_step_2
   DISCORD_CLIENT_ID=your_application_id_from_step_1
   GUILD_ID=your_server_id_from_step_3
   DATABASE_PATH=./data/streaky.db
   GROQ_API_KEY=your_groq_api_key  # Optional
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Deploy slash commands:
   ```bash
   npm run deploy-commands
   ```

6. Start the bot:
   ```bash
   npm start
   ```

### Development

```bash
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/study start [topics]` | Start a study session |
| `/study stop` | Stop your current session |
| `/study topics <topics>` | Update your session's topics |
| `/study stats [@user]` | View study statistics |
| `/study today` | View today's progress |
| `/study leaderboard` | View the leaderboard |
| `/study config view` | View bot configuration |
| `/study config threshold <mins>` | Set minimum study time |
| `/study config adduser <@user>` | Add allowed user |
| `/study config removeuser <@user>` | Remove allowed user |
| `/study config addtopic <topic>` | Add a study topic |
| `/study config removetopic <topic>` | Remove a study topic |
| `/loveme setup @partner` | Set your partner (one-time, mutual) |
| `/loveme now` | Get a cute love message from your partner 💕 |

## Deployment

### Oracle Cloud Free Tier (Recommended - Always Free)

Oracle Cloud offers always-free ARM instances that never expire - perfect for Discord bots.

#### Step 1: Create Oracle Cloud Account

1. Go to [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Click "Start for free" and create an account
3. You'll need a credit card for verification (won't be charged for free tier)

#### Step 2: Create a Compute Instance

1. Go to Oracle Cloud Console > Compute > Instances
2. Click "Create Instance"
3. Configure:
   - **Name**: `streakybot`
   - **Image**: Ubuntu 22.04 (or latest)
   - **Shape**: Click "Change Shape" > Ampere (ARM) > VM.Standard.A1.Flex
     - OCPUs: 1 (free tier allows up to 4)
     - Memory: 6 GB (free tier allows up to 24 GB)
   - **Networking**: Create new VCN or use existing
   - **SSH Keys**: Upload your public key or generate new
4. Click "Create"
5. Wait for instance to be "Running" and note the **Public IP**

#### Step 3: Configure Firewall (Security List)

The bot only needs outbound access (no inbound ports needed for Discord bots).

1. Go to Networking > Virtual Cloud Networks
2. Click your VCN > Security Lists > Default Security List
3. Ensure egress rule allows all outbound traffic (default)

#### Step 4: Setup the VM

SSH into your instance:
```bash
ssh -i ~/.ssh/your_key ubuntu@<your-vm-public-ip>
```

Run the setup script:
```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/streakybot/main/deploy/oracle-cloud/setup.sh | bash
```

Or manually:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential python3

# Create directories
sudo mkdir -p /opt/streakybot/data
sudo chown -R ubuntu:ubuntu /opt/streakybot
```

#### Step 5: Deploy the Bot

**Option A: Using deploy script (from your local machine)**
```bash
# Make the script executable
chmod +x deploy/oracle-cloud/deploy.sh

# Deploy (builds locally, syncs to server)
./deploy/oracle-cloud/deploy.sh <your-vm-ip> ~/.ssh/your_key
```

**Option B: Manual deployment**
```bash
# On your local machine - copy files to server
scp -i ~/.ssh/your_key -r ./* ubuntu@<vm-ip>:/opt/streakybot/

# SSH into server
ssh -i ~/.ssh/your_key ubuntu@<vm-ip>

# Install dependencies and build
cd /opt/streakybot
npm ci
npm run build
```

#### Step 6: Configure Environment

Create the environment file on the server:
```bash
sudo nano /opt/streakybot/.env
```

Add your secrets:
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id
DATABASE_PATH=/opt/streakybot/data/streaky.db
GROQ_API_KEY=your_groq_api_key
```

#### Step 7: Setup Systemd Service

```bash
# Copy service file
sudo cp /opt/streakybot/deploy/oracle-cloud/streakybot.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable streakybot

# Start the bot
sudo systemctl start streakybot

# Check status
sudo systemctl status streakybot
```

#### Step 8: Deploy Slash Commands

Run this once from your local machine (with .env configured):
```bash
npm run deploy-commands
```

**Useful commands:**
```bash
# View logs (live)
sudo journalctl -u streakybot -f

# View recent logs
sudo journalctl -u streakybot -n 100

# Restart bot
sudo systemctl restart streakybot

# Stop bot
sudo systemctl stop streakybot
```

---

### Fly.io (Alternative - Free Tier)

1. Install Fly CLI:
   ```bash
   # macOS
   brew install flyctl

   # Or via curl
   curl -L https://fly.io/install.sh | sh
   ```

2. Login/Signup:
   ```bash
   fly auth login
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Launch the app (first time only):
   ```bash
   fly launch --no-deploy
   ```
   - Choose a unique app name
   - Select region: `sin` (Singapore) for India
   - Say **No** to Postgres/Redis

5. Create persistent volume for database:
   ```bash
   fly volumes create streaky_data --region sin --size 1
   ```

6. Set environment secrets:
   ```bash
   fly secrets set DISCORD_TOKEN=your_bot_token
   fly secrets set DISCORD_CLIENT_ID=your_client_id
   fly secrets set GUILD_ID=your_server_id
   fly secrets set GROQ_API_KEY=your_groq_key  # Optional
   ```

7. Deploy:
   ```bash
   fly deploy
   ```

8. Deploy slash commands (run locally once):
   ```bash
   npm run deploy-commands
   ```

**Useful Fly.io commands:**
```bash
fly logs          # View bot logs
fly status        # Check app status
fly apps restart  # Restart the bot
```

---

### Docker (Self-hosted)

```bash
docker-compose up -d
```

## How It Works

1. Join a voice channel and run `/study start`
2. Your study time is tracked while you're in voice
3. If you leave and rejoin within 1 hour, your session resumes
4. Once you accumulate 60+ minutes in a day, it counts toward your streak
5. If your partner is in the same voice channel, you both get tracked for "together time"
6. 60+ minutes of together time = a "together day"

## License

MIT
