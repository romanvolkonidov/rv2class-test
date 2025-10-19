#!/bin/bash

# ============================================
# Deploy Jitsi Homework Features to Server
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="207.246.95.30"
SERVER_USER="root"
JITSI_PATH="/usr/share/jitsi-meet"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Deploy Jitsi Homework Features to Server               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Copy homework feature files
echo -e "${YELLOW}[1/4]${NC} Copying homework React components to server..."
sshpass -p "eG7[89B2tgdJM=t2" scp -r jitsi-custom/jitsi-meet/react/features/homework \
    ${SERVER_USER}@${SERVER_IP}:${JITSI_PATH}/react/features/
echo -e "${GREEN}✓${NC} Homework components copied"

# Step 2: Copy CSS files
echo ""
echo -e "${YELLOW}[2/4]${NC} Copying CSS files..."
sshpass -p "eG7[89B2tgdJM=t2" scp jitsi-custom/jitsi-meet/css/main.scss \
    ${SERVER_USER}@${SERVER_IP}:${JITSI_PATH}/css/main.scss
echo -e "${GREEN}✓${NC} CSS files copied"

# Step 3: Build on server
echo ""
echo -e "${YELLOW}[3/4]${NC} Building Jitsi on server..."
sshpass -p "eG7[89B2tgdJM=t2" ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /usr/share/jitsi-meet
echo "Building Jitsi with homework features..."
make
echo "Build complete!"
ENDSSH
echo -e "${GREEN}✓${NC} Jitsi built successfully"

# Step 4: Restart services
echo ""
echo -e "${YELLOW}[4/4]${NC} Restarting Jitsi services..."
sshpass -p "eG7[89B2tgdJM=t2" ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
systemctl restart nginx
systemctl restart jicofo
systemctl restart jitsi-videobridge2
ENDSSH
echo -e "${GREEN}✓${NC} Services restarted"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  Deployment Complete! ✓                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Homework features are now live on your Jitsi server!"
echo -e "Server: ${BLUE}https://${SERVER_IP}${NC}"
echo ""
