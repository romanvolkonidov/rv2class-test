#!/bin/bash

# Quick configuration and startup for bot service on Vultr server

echo "🔧 Configuring Bot Service on Vultr"
echo "===================================="

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create .env file
cat > /opt/jitsi-bot-service/.env << EOF
# Jitsi Configuration
JITSI_DOMAIN=online.rv2class.com

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_APP_ID=rv2class
JWT_ISSUER=rv2class

# Firebase Admin SDK (YOU NEED TO FILL THESE IN!)
FIREBASE_PROJECT_ID=tracking-budget-app
FIREBASE_PRIVATE_KEY="PASTE_YOUR_PRIVATE_KEY_HERE"
FIREBASE_CLIENT_EMAIL=PASTE_YOUR_CLIENT_EMAIL_HERE

# API Ports
PORT=3001
JWT_API_PORT=3002

# Bot Configuration
BOT_DISPLAY_NAME=Lobby Bot
CHECK_INTERVAL=5000
EOF

echo "✅ .env file created with JWT secret"
echo ""
echo "⚠️  IMPORTANT: You must edit .env and add Firebase credentials!"
echo ""
echo "To get Firebase credentials:"
echo "1. Go to https://console.firebase.google.com/"
echo "2. Select 'tracking-budget-app' project"
echo "3. Go to Project Settings → Service Accounts"
echo "4. Click 'Generate New Private Key'"
echo "5. Copy the values to /opt/jitsi-bot-service/.env"
echo ""
read -p "Press Enter to edit .env now, or Ctrl+C to exit..."

nano /opt/jitsi-bot-service/.env

echo ""
echo "Starting service..."
cd /opt/jitsi-bot-service
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo ""
echo "✅ Bot service configured and started!"
echo ""
echo "Check status:"
echo "  pm2 status"
echo "  pm2 logs jitsi-bot-service"
echo ""
echo "Test APIs:"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3002/api/health"
