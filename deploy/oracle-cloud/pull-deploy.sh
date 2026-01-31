#!/bin/bash
# Server-side deploy script
# Just run: ./pull-deploy.sh
# It will pull latest code from GitHub, build, and restart the bot

set -e

APP_DIR="/opt/streakybot"
BRANCH="main"

echo "=== StreakyBot Pull Deploy ==="
echo ""

cd "$APP_DIR"

# Check if it's a git repo
if [ ! -d ".git" ]; then
    echo "Error: Not a git repository. Run initial setup first:"
    echo "  cd /opt/streakybot"
    echo "  git clone <your-repo-url> ."
    exit 1
fi

# Stash any local changes (like .env)
echo "1. Stashing local changes..."
git stash --include-untracked 2>/dev/null || true

# Pull latest code
echo "2. Pulling latest from $BRANCH..."
git fetch origin
git reset --hard origin/$BRANCH

# Restore stashed changes
echo "3. Restoring local files..."
git stash pop 2>/dev/null || true

# Install dependencies
echo "4. Installing dependencies..."
npm ci --only=production

# Build TypeScript
echo "5. Building..."
npm run build

# Restart service
echo "6. Restarting bot..."
sudo systemctl restart streakybot

# Show status
echo ""
echo "=== Deploy Complete ==="
sudo systemctl status streakybot --no-pager

echo ""
echo "View logs: sudo journalctl -u streakybot -f"
