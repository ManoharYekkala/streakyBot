# StreakyBot

A Discord bot for tracking study sessions via voice channel presence, maintaining streaks, and gamifying accountability.

## Features

- **Voice-based tracking**: Study time is tracked when you're in a voice channel
- **Streak system**: Maintain consecutive study days (requires 60+ mins/day)
- **Couple mode**: Track study sessions together with your partner
- **Love messages**: Get AI-generated cute messages from your partner

## Commands

| Command                             | Description                                  |
| ----------------------------------- | -------------------------------------------- |
| `/study start [topics]`             | Start a study session                        |
| `/study stop`                       | Stop your current session                    |
| `/study topics <topics>`            | Update your session's topics                 |
| `/study stats [@user]`              | View study statistics                        |
| `/study today`                      | View today's progress                        |
| `/study leaderboard`                | View the leaderboard                         |
| `/study config view`                | View bot configuration                       |
| `/study config threshold <mins>`    | Set minimum study time                       |
| `/study config adduser <@user>`     | Add allowed user                             |
| `/study config removeuser <@user>`  | Remove allowed user                          |
| `/study config addtopic <topic>`    | Add a study topic                            |
| `/study config removetopic <topic>` | Remove a study topic                         |
| `/loveme setup @partner`            | Set your partner (one-time, mutual)          |
| `/loveme now`                       | Get a cute love message from your partner 💕 |

## Setup

### 1. Get Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application → copy **Application ID** (`DISCORD_CLIENT_ID`)
3. Go to Bot tab → Reset Token → copy token (`DISCORD_TOKEN`)
4. Enable Developer Mode in Discord → right-click server → Copy Server ID (`GUILD_ID`)
5. OAuth2 → URL Generator → select `bot` + `applications.commands` → invite bot

### 2. Get Groq API Key (Optional)

1. Go to [Groq Console](https://console.groq.com/keys)
2. Create API Key → copy (`GROQ_API_KEY`)

### 3. Local Development

```bash
npm install
cp .env.example .env  # Edit with your credentials
npm run build
npm run deploy-commands
npm run dev
```

## Deployment (Oracle Cloud Free Tier)

### First Time Setup

**1. Create Oracle Cloud Instance:**

- Go to [Oracle Cloud](https://www.oracle.com/cloud/free/) → Create free account
- Compute → Create Instance → Ubuntu 22.04 → `VM.Standard.E2.1.Micro` (free)
- Ensure "Assign public IPv4 address" is checked
- Add your SSH key → Create

**2. Setup the VM:**

```bash
ssh -i ~/.ssh/your_key ubuntu@<VM_IP>

# Install Node.js
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential python3

# Clone repo
sudo mkdir -p /opt/streakybot/data
sudo chown -R ubuntu:ubuntu /opt/streakybot
cd /opt/streakybot
git clone https://github.com/YOUR_USERNAME/streakyBot.git .

# Install & build
npm ci --only=production
npm run build

# Create .env
nano .env
# Add: DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID, DATABASE_PATH=/opt/streakybot/data/streaky.db, GROQ_API_KEY

# Setup service
sudo cp deploy/oracle-cloud/streakybot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now streakybot
```

**3. Deploy slash commands (run locally once):**

```bash
npm run deploy-commands
```

### Deploying Updates

After pushing to GitHub, run on server:

```bash
cd /opt/streakybot && ./deploy/oracle-cloud/pull-deploy.sh
```

### Useful Commands

```bash
# SSH into server
ssh -i ~/.ssh/your_key ubuntu@<VM_IP>

# View logs
sudo journalctl -u streakybot -f

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
