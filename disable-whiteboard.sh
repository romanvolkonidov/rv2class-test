#!/bin/bash

###############################################################################
# Option 1: Disable Whiteboard Temporarily (Quick Fix)
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }

SERVER_IP="108.61.245.179"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"

echo ""
echo -e "${YELLOW}══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Disabling Whiteboard Feature${NC}"
echo -e "${YELLOW}══════════════════════════════════════════${NC}"
echo ""

print_status "Disabling whiteboard in Jitsi config..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'

# Backup the config
cp /etc/jitsi/meet/app.rv2class.com-config.js /etc/jitsi/meet/app.rv2class.com-config.js.backup-whiteboard

# Disable the whiteboard feature
sed -i 's/whiteboard: {/whiteboard: {\n        enabled: false,/' /etc/jitsi/meet/app.rv2class.com-config.js

# Also remove whiteboard from toolbar buttons
sed -i "s/'whiteboard'/\/\/ 'whiteboard'/" /etc/jitsi/meet/app.rv2class.com-config.js

echo "✓ Whiteboard feature disabled in config"

ENDSSH

print_success "Whiteboard disabled!"

echo ""
echo -e "${GREEN}✓ Whiteboard feature has been disabled${NC}"
echo ""
echo "The Excalidraw loading errors should now be gone."
echo ""
echo "To re-enable later, restore the backup:"
echo "  cp /etc/jitsi/meet/app.rv2class.com-config.js.backup-whiteboard \\"
echo "     /etc/jitsi/meet/app.rv2class.com-config.js"
echo ""

print_success "Done! Test at https://app.rv2class.com"

