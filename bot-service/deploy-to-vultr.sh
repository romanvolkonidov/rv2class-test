#!/bin/bash

# Deploy Bot Service to Vultr Server
# Server: 45.77.76.123 (New Jersey)

set -e

echo "🚀 Deploying Jitsi Bot Service to Vultr"
echo "========================================"

SERVER_HOST="45.77.76.123"
SERVER_USER="root"
DEPLOY_PATH="/opt/jitsi-bot-service"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📦 Step 1: Preparing deployment package...${NC}"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$(dirname "$0")"

# Copy necessary files
cp -r index.js RoomBot.js JWTService.js jwt-api.js package.json ecosystem.config.cjs .gitignore "$TEMP_DIR/"
cp .env.example "$TEMP_DIR/.env"

echo -e "${GREEN}✅ Package prepared${NC}"

echo -e "${YELLOW}📤 Step 2: Uploading to server...${NC}"

# Create directory on server
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "mkdir -p $DEPLOY_PATH"

# Upload files
scp -o StrictHostKeyChecking=no -r "$TEMP_DIR"/* "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

# Clean up
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✅ Files uploaded${NC}"

echo -e "${YELLOW}⚙️  Step 3: Installing and starting service...${NC}"

# Install and start on server
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

cd /opt/jitsi-bot-service

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

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

echo ""
echo "⚠️  IMPORTANT: You need to configure .env file!"
echo ""
echo "Edit /opt/jitsi-bot-service/.env and add:"
echo "  - JWT_SECRET (generate: openssl rand -base64 32)"
echo "  - FIREBASE credentials"
echo "  - JITSI_DOMAIN=online.rv2class.com"
echo ""
echo "After editing .env, start the service with:"
echo "  cd /opt/jitsi-bot-service && pm2 start ecosystem.config.cjs"
echo ""

ENDSSH

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. SSH into your server:"
echo "   ssh root@45.77.76.123"
echo ""
echo "2. Configure environment variables:"
echo "   nano /opt/jitsi-bot-service/.env"
echo ""
echo "   Required variables:"
echo "   - JITSI_DOMAIN=online.rv2class.com"
echo "   - JWT_SECRET (generate with: openssl rand -base64 32)"
echo "   - FIREBASE_PROJECT_ID=tracking-budget-app"
echo "   - FIREBASE_PRIVATE_KEY (from Firebase console)"
echo "   - FIREBASE_CLIENT_EMAIL (from Firebase console)"
echo ""
echo "3. Start the service:"
echo "   cd /opt/jitsi-bot-service"
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. Check status:"
echo "   pm2 status"
echo "   pm2 logs jitsi-bot-service"
echo ""
echo "5. Test APIs:"
echo "   curl http://45.77.76.123:3001/health"
echo "   curl http://45.77.76.123:3002/api/health"
echo ""
echo "🎉 Done!"
