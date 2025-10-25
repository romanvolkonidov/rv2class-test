#!/bin/bash

# Complete Deployment Script for Jitsi Bot Service
# This script deploys the bot service to your server

set -e  # Exit on any error

echo "🚀 Deploying Jitsi Bot Service"
echo "================================"

# Configuration
SERVER_USER=${SERVER_USER:-"root"}
SERVER_HOST=${SERVER_HOST:-"your-server.com"}
DEPLOY_PATH=${DEPLOY_PATH:-"/opt/jitsi-bot-service"}
JWT_API_PORT=${JWT_API_PORT:-3002}
BOT_API_PORT=${BOT_API_PORT:-3001}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file from .env.example and fill in your values"
    exit 1
fi

if ! command -v ssh &> /dev/null; then
    echo -e "${RED}❌ SSH not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Step 2: Create deployment package
echo -e "\n${YELLOW}Step 2: Creating deployment package...${NC}"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy files
cp -r . "$TEMP_DIR/bot-service"
cd "$TEMP_DIR/bot-service"

# Remove unnecessary files
rm -rf node_modules logs .git .env.example README.md

echo -e "${GREEN}✅ Deployment package created${NC}"

# Step 3: Upload to server
echo -e "\n${YELLOW}Step 3: Uploading to server...${NC}"

ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $DEPLOY_PATH"

rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    . "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

echo -e "${GREEN}✅ Files uploaded${NC}"

# Step 4: Upload .env file
echo -e "\n${YELLOW}Step 4: Uploading environment configuration...${NC}"

cd - > /dev/null
scp .env "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/.env"

echo -e "${GREEN}✅ Environment configuration uploaded${NC}"

# Step 5: Install dependencies and start service
echo -e "\n${YELLOW}Step 5: Installing dependencies and starting service...${NC}"

ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

cd /opt/jitsi-bot-service

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Stop existing service if running
if pm2 list | grep -q "jitsi-bot-service"; then
    echo "🛑 Stopping existing service..."
    pm2 stop jitsi-bot-service || true
    pm2 delete jitsi-bot-service || true
fi

# Create logs directory
mkdir -p logs

# Start service
echo "🚀 Starting bot service..."
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
if ! pm2 startup | grep -q "already configured"; then
    pm2 startup systemd -u $USER --hp $HOME
fi

echo "✅ Service started successfully!"

# Show status
pm2 status

ENDSSH

echo -e "${GREEN}✅ Service deployed and started${NC}"

# Step 6: Verify deployment
echo -e "\n${YELLOW}Step 6: Verifying deployment...${NC}"

sleep 5  # Wait for services to start

# Check bot service
echo "Checking bot service..."
if curl -f -s "http://$SERVER_HOST:$BOT_API_PORT/health" > /dev/null; then
    echo -e "${GREEN}✅ Bot service is running${NC}"
else
    echo -e "${RED}❌ Bot service is not responding${NC}"
fi

# Check JWT API
echo "Checking JWT API..."
if curl -f -s "http://$SERVER_HOST:$JWT_API_PORT/api/health" > /dev/null; then
    echo -e "${GREEN}✅ JWT API is running${NC}"
else
    echo -e "${RED}❌ JWT API is not responding${NC}"
fi

# Step 7: Configure firewall (optional)
echo -e "\n${YELLOW}Step 7: Configuring firewall (optional)...${NC}"

read -p "Do you want to open firewall ports for the APIs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh "$SERVER_USER@$SERVER_HOST" << ENDSSH
    if command -v ufw &> /dev/null; then
        echo "Configuring UFW..."
        ufw allow $BOT_API_PORT/tcp
        ufw allow $JWT_API_PORT/tcp
        echo "✅ Firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        echo "Configuring firewalld..."
        firewall-cmd --permanent --add-port=$BOT_API_PORT/tcp
        firewall-cmd --permanent --add-port=$JWT_API_PORT/tcp
        firewall-cmd --reload
        echo "✅ Firewall configured"
    else
        echo "⚠️  No firewall detected, skipping..."
    fi
ENDSSH
fi

# Final summary
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Bot Service API: http://$SERVER_HOST:$BOT_API_PORT"
echo "JWT API:         http://$SERVER_HOST:$JWT_API_PORT"
echo ""
echo "Useful commands:"
echo "  View logs:      ssh $SERVER_USER@$SERVER_HOST 'pm2 logs jitsi-bot-service'"
echo "  Check status:   ssh $SERVER_USER@$SERVER_HOST 'pm2 status'"
echo "  Restart:        ssh $SERVER_USER@$SERVER_HOST 'pm2 restart jitsi-bot-service'"
echo "  Stop:           ssh $SERVER_USER@$SERVER_HOST 'pm2 stop jitsi-bot-service'"
echo ""
echo "Next steps:"
echo "1. Update your frontend to use JWT API at http://$SERVER_HOST:$JWT_API_PORT"
echo "2. Test teacher login and auto-admission"
echo "3. Test student lobby placement"
echo "4. Monitor logs for any issues"
echo ""
echo "🎉 Happy teaching!"
