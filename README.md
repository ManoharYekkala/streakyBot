# StreakyBot

A Discord bot for tracking study sessions via voice channel presence, maintaining streaks, and gamifying accountability.

## Features

- **Voice-based tracking**: Study time is tracked when you're in a voice channel
- **Streak system**: Maintain consecutive study days (requires 60+ mins/day)
- **Couple mode**: Track study sessions together with your partner
- **Love messages**: Get AI-generated cute messages from your partner

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
| `/loveme setup @partner` | Set your partner |
| `/loveme now` | Get a cute love message |

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

# Check status
sudo systemctl status streakybot
```

## License

MIT
