#!/bin/bash

# ============================================
# Automated Production Deployment Script
# Deploys local changes to Vultr server
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="207.246.95.30"  # Your main Vultr server
SERVER_USER="root"
SERVER_PASSWORD="eG7[89B2tgdJM=t2"
APP_PATH="/var/www/rv2class"  # Adjust if different
PM2_APP_NAME="rv2class"  # Adjust if different

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         RV2Class Production Deployment                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check for uncommitted changes
echo -e "${YELLOW}[1/6]${NC} Checking for local changes..."
if [[ -n $(git status -s) ]]; then
    echo -e "${GREEN}✓${NC} Found local changes"
    git status -s
    echo ""
    read -p "Enter commit message (or press Enter for 'Auto-deploy'): " COMMIT_MSG
    COMMIT_MSG=${COMMIT_MSG:-"Auto-deploy $(date '+%Y-%m-%d %H:%M:%S')"}
    
    git add .
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✓${NC} Changes committed"
else
    echo -e "${GREEN}✓${NC} No uncommitted changes"
fi

# Step 2: Push to GitHub
echo ""
echo -e "${YELLOW}[2/6]${NC} Pushing to GitHub..."
if git push origin main; then
    echo -e "${GREEN}✓${NC} Code pushed to GitHub"
else
    echo -e "${RED}✗${NC} Failed to push to GitHub"
    echo "Please check your GitHub credentials and try again"
    exit 1
fi

# Step 3: Install sshpass if not present (for password-based SSH)
echo ""
echo -e "${YELLOW}[3/6]${NC} Checking SSH tools..."
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    sudo apt-get update -qq
    sudo apt-get install -y sshpass
fi
echo -e "${GREEN}✓${NC} SSH tools ready"

# Step 4: SSH into server and deploy
echo ""
echo -e "${YELLOW}[4/6]${NC} Connecting to production server..."
echo "Server: $SERVER_IP"

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -e

echo ""
echo "=== Connected to Production Server ==="
echo ""

# Check if app directory exists
if [ ! -d "/var/www/rv2class" ]; then
    echo "App directory not found. Checking common locations..."
    
    if [ -d "/root/rv2class" ]; then
        APP_PATH="/root/rv2class"
    elif [ -d "/opt/rv2class" ]; then
        APP_PATH="/opt/rv2class"
    elif [ -d "/home/rv2class" ]; then
        APP_PATH="/home/rv2class"
    else
        echo "ERROR: Cannot find rv2class directory!"
        echo "Please specify the correct path."
        exit 1
    fi
else
    APP_PATH="/var/www/rv2class"
fi

echo "Using app path: $APP_PATH"
cd $APP_PATH

echo ""
echo "[5/6] Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/main
echo "✓ Code updated"

echo ""
echo "[6/6] Rebuilding and restarting application..."

# Install dependencies if package.json changed
if git diff --name-only HEAD@{1} HEAD | grep -q package.json; then
    echo "Dependencies changed, running npm install..."
    npm install
fi

# Build Next.js app
echo "Building Next.js application..."
npm run build

# Restart the application
echo "Restarting application..."

# Try PM2 first
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q rv2class; then
        pm2 restart rv2class
        echo "✓ PM2 app restarted"
    elif pm2 list | grep -q next; then
        pm2 restart next
        echo "✓ PM2 app restarted"
    else
        pm2 start npm --name "rv2class" -- start
        echo "✓ PM2 app started"
    fi
    pm2 save
    
# Try systemd if PM2 not found
elif systemctl is-active --quiet rv2class; then
    sudo systemctl restart rv2class
    echo "✓ Systemd service restarted"
    
# Check if running in Docker
elif command -v docker &> /dev/null && docker ps | grep -q rv2class; then
    docker restart rv2class
    echo "✓ Docker container restarted"
    
else
    echo "WARNING: Could not determine how to restart the app"
    echo "Please restart it manually"
fi

echo ""
echo "=== Deployment Complete! ==="
echo ""

# Show app status
if command -v pm2 &> /dev/null; then
    pm2 list
fi

ENDSSH

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Deployment Successful! ✓                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Your changes are now live at:"
echo -e "${BLUE}https://rv2class.com${NC}"
echo ""
echo "Next steps:"
echo "  • Test your changes on the live site"
echo "  • Check the logs: ssh root@$SERVER_IP 'pm2 logs'"
echo "  • If needed, restore snapshot from Vultr dashboard"
echo ""
