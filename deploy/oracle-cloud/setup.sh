#!/bin/bash
# Oracle Cloud Free Tier Setup Script for StreakyBot
# Run this on your Oracle Cloud VM after SSH-ing in

set -e

echo "=== StreakyBot Oracle Cloud Setup ==="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install build essentials (needed for better-sqlite3)
echo "Installing build tools..."
sudo apt install -y build-essential python3

# Create app directory
echo "Creating app directory..."
sudo mkdir -p /opt/streakybot
sudo chown $USER:$USER /opt/streakybot

# Create data directory for SQLite
sudo mkdir -p /opt/streakybot/data
sudo chown $USER:$USER /opt/streakybot/data

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Copy your project files to /opt/streakybot/"
echo "2. Create /opt/streakybot/.env with your secrets"
echo "3. Run: cd /opt/streakybot && npm install && npm run build"
echo "4. Run: sudo cp deploy/oracle-cloud/streakybot.service /etc/systemd/system/"
echo "5. Run: sudo systemctl daemon-reload"
echo "6. Run: sudo systemctl enable streakybot"
echo "7. Run: sudo systemctl start streakybot"
echo ""
echo "Check logs with: sudo journalctl -u streakybot -f"
