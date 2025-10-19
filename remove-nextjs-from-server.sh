#!/bin/bash

# ============================================
# Remove Next.js App from Server
# Keep only Jitsi with integrated homework
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="108.61.245.179"
SERVER_USER="root"
SERVER_PASSWORD="eG7[89B2tgdJM=t2"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Removing Next.js - Keeping Only Jitsi                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Connecting to server: ${SERVER_IP}${NC}"
echo ""

sshpass -p "${SERVER_PASSWORD}" ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'

echo "🔍 Checking what's running on the server..."
echo ""

# Check for PM2 processes
if command -v pm2 &> /dev/null; then
    echo "📋 Current PM2 processes:"
    pm2 list
    echo ""
    
    # Stop and delete rv2class-frontend if it exists
    if pm2 list | grep -q "rv2class-frontend"; then
        echo "🛑 Stopping rv2class-frontend..."
        pm2 stop rv2class-frontend
        pm2 delete rv2class-frontend
        pm2 save
        echo "✅ rv2class-frontend removed from PM2"
    else
        echo "ℹ️  rv2class-frontend not found in PM2"
    fi
    echo ""
fi

# Check and remove Next.js directory
if [ -d "/var/www/rv2class-frontend" ]; then
    echo "🗑️  Removing Next.js frontend directory..."
    rm -rf /var/www/rv2class-frontend
    echo "✅ /var/www/rv2class-frontend removed"
else
    echo "ℹ️  /var/www/rv2class-frontend not found"
fi

# Check nginx configuration
echo ""
echo "🔍 Checking nginx configuration..."
if [ -f "/etc/nginx/sites-enabled/rv2class-frontend" ]; then
    echo "🗑️  Removing nginx config for Next.js frontend..."
    rm -f /etc/nginx/sites-enabled/rv2class-frontend
    rm -f /etc/nginx/sites-available/rv2class-frontend
    nginx -t && systemctl reload nginx
    echo "✅ Nginx config removed and reloaded"
else
    echo "ℹ️  No nginx config found for rv2class-frontend"
fi

echo ""
echo "📊 Current server status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show what's left running
echo "🟢 Jitsi services:"
systemctl status jitsi-videobridge2 | grep "Active:" || echo "  jitsi-videobridge2 not found"
systemctl status jicofo | grep "Active:" || echo "  jicofo not found"
systemctl status nginx | grep "Active:" || echo "  nginx not found"

echo ""
echo "📁 Remaining directories in /var/www:"
ls -la /var/www/ | grep -v "total" | grep -v "^\." || echo "  Empty"

echo ""
echo "✅ Server cleanup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENDSSH

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Next.js App Removed! ✓                        ║${NC}"
echo -e "${GREEN}║         Server now running ONLY Jitsi                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "✅ All homework features are now integrated in Jitsi"
echo -e "🌐 Your Jitsi server: ${BLUE}https://${SERVER_IP}${NC}"
echo ""
