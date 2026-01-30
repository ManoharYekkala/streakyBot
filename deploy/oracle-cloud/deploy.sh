#!/bin/bash
# Deploy script - run from your local machine
# Usage: ./deploy.sh <your-vm-ip> [ssh-key-path]
# Example: ./deploy.sh 129.154.xxx.xxx ~/.ssh/oracle_key

set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <vm-ip-address> [ssh-key-path]"
    echo "Example: ./deploy.sh 129.154.xxx.xxx ~/.ssh/oracle_key"
    exit 1
fi

VM_IP=$1
SSH_KEY=${2:-~/.ssh/id_rsa}
SSH_USER="ubuntu"
REMOTE_DIR="/opt/streakybot"

echo "=== Building project locally ==="
cd "$(dirname "$0")/../.."
npm run build

echo ""
echo "=== Deploying to Oracle Cloud VM ==="
echo "Target: $SSH_USER@$VM_IP"

# Create remote directory if it doesn't exist
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo mkdir -p $REMOTE_DIR && sudo chown $SSH_USER:$SSH_USER $REMOTE_DIR"

# Sync files (excluding node_modules, .env, and data)
echo "Syncing files..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'data' \
    --exclude '.git' \
    --exclude '*.db' \
    -e "ssh -i $SSH_KEY" \
    ./ "$SSH_USER@$VM_IP:$REMOTE_DIR/"

echo ""
echo "=== Installing dependencies on remote ==="
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "cd $REMOTE_DIR && npm ci --only=production"

echo ""
echo "=== Restarting service ==="
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo systemctl restart streakybot"

echo ""
echo "=== Deployment complete! ==="
echo "Check logs with: ssh -i $SSH_KEY $SSH_USER@$VM_IP 'sudo journalctl -u streakybot -f'"
