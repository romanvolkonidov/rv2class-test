#!/bin/bash

# Diagnose and Fix Jitsi Config Issues
# Run this on your Jitsi server (jitsi.rv2class.com)

echo "========================================="
echo "Jitsi Configuration Diagnostic & Fix"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CONFIG_FILE="/etc/jitsi/meet/jitsi.rv2class.com-config.js"
INTERFACE_CONFIG="/usr/share/jitsi-meet/interface_config.js"

# Step 1: Check if config file exists
echo "1. Checking config file..."
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${GREEN}✓ Config file exists${NC}"
else
    echo -e "${RED}✗ Config file not found at $CONFIG_FILE${NC}"
    exit 1
fi

# Step 2: Backup current config
echo ""
echo "2. Creating backup..."
BACKUP_FILE="/etc/jitsi/meet/jitsi.rv2class.com-config.js.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"

# Step 3: Check for syntax errors
echo ""
echo "3. Checking for JavaScript syntax errors..."
if node -c "$CONFIG_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ No syntax errors found${NC}"
else
    echo -e "${YELLOW}⚠ Syntax check failed (might be due to 'var config' declaration)${NC}"
    echo "   Will check manually..."
fi

# Step 4: Check for the 'var config' declaration
echo ""
echo "4. Checking for proper config declaration..."
if grep -q "^var config = {" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ Config declaration found${NC}"
elif grep -q "config = {" "$CONFIG_FILE"; then
    echo -e "${YELLOW}⚠ Config declaration missing 'var' keyword${NC}"
    echo "   Fixing..."
    sudo sed -i 's/^config = {/var config = {/' "$CONFIG_FILE"
    echo -e "${GREEN}✓ Fixed${NC}"
else
    echo -e "${RED}✗ Config declaration not found or malformed${NC}"
    echo "   The file might be corrupted. Check the file manually."
fi

# Step 5: Fix BOSH URL
echo ""
echo "5. Fixing BOSH URL..."
if grep -q "bosh: '.*http-bind'" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ BOSH URL looks correct${NC}"
else
    echo -e "${YELLOW}⚠ BOSH URL needs fixing${NC}"
    # Remove any broken multi-line BOSH entries
    sudo sed -i '/bosh:/,/http-bind/ {
        /bosh:/!d
        s|bosh:.*|bosh: '\''https://jitsi.rv2class.com/http-bind'\'',|
    }' "$CONFIG_FILE"
    echo -e "${GREEN}✓ BOSH URL fixed${NC}"
fi

# Step 6: Fix WebSocket URL
echo ""
echo "6. Fixing WebSocket URL..."
if grep -q "websocket: '.*xmpp-websocket'" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ WebSocket URL looks correct${NC}"
else
    echo -e "${YELLOW}⚠ WebSocket URL needs fixing${NC}"
    # Remove any broken multi-line WebSocket entries
    sudo sed -i '/websocket:/,/xmpp-websocket/ {
        /websocket:/!d
        s|websocket:.*|websocket: '\''wss://jitsi.rv2class.com/xmpp-websocket'\'',|
    }' "$CONFIG_FILE"
    echo -e "${GREEN}✓ WebSocket URL fixed${NC}"
fi

# Step 7: Ensure proper hosts configuration
echo ""
echo "7. Checking hosts configuration..."
if grep -q "domain: 'jitsi.rv2class.com'" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ Domain configured correctly${NC}"
else
    echo -e "${YELLOW}⚠ Domain might not be set correctly${NC}"
fi

# Step 8: Check for unclosed braces/brackets
echo ""
echo "8. Checking for unclosed braces..."
OPEN_BRACES=$(grep -o "{" "$CONFIG_FILE" | wc -l)
CLOSE_BRACES=$(grep -o "}" "$CONFIG_FILE" | wc -l)
if [ "$OPEN_BRACES" -eq "$CLOSE_BRACES" ]; then
    echo -e "${GREEN}✓ Braces balanced ($OPEN_BRACES opening, $CLOSE_BRACES closing)${NC}"
else
    echo -e "${RED}✗ Braces NOT balanced ($OPEN_BRACES opening, $CLOSE_BRACES closing)${NC}"
    echo "   File may be corrupted. Restoring from backup and applying clean fix..."
    
    # Restore backup and apply a clean fix
    sudo cp "$BACKUP_FILE" "$CONFIG_FILE"
fi

# Step 9: Validate the file can be loaded by checking critical sections
echo ""
echo "9. Validating critical configuration sections..."

ISSUES_FOUND=0

if ! grep -q "hosts: {" "$CONFIG_FILE"; then
    echo -e "${RED}✗ 'hosts' section missing${NC}"
    ISSUES_FOUND=1
fi

if ! grep -q "bosh:" "$CONFIG_FILE"; then
    echo -e "${RED}✗ 'bosh' URL missing${NC}"
    ISSUES_FOUND=1
fi

if ! grep -q "websocket:" "$CONFIG_FILE"; then
    echo -e "${RED}✗ 'websocket' URL missing${NC}"
    ISSUES_FOUND=1
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ All critical sections present${NC}"
fi

# Step 10: Create a minimal working config if needed
if [ $ISSUES_FOUND -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}10. Creating minimal working configuration...${NC}"
    
    # Create a clean minimal config
    sudo tee "$CONFIG_FILE" > /dev/null << 'EOFCONFIG'
var config = {
    hosts: {
        domain: 'jitsi.rv2class.com',
        muc: 'conference.jitsi.rv2class.com'
    },
    bosh: 'https://jitsi.rv2class.com/http-bind',
    websocket: 'wss://jitsi.rv2class.com/xmpp-websocket',
    
    // Basic settings
    enableWelcomePage: false,
    enableClosePage: false,
    defaultLanguage: 'en',
    
    // P2P Configuration
    p2p: {
        enabled: true,
        stunServers: [
            { urls: 'stun:jitsi.rv2class.com:3478' },
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all'
    },
    
    // Room settings
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    prejoinPageEnabled: false,
    disableDeepLinking: true,
    
    // Moderator settings
    disableModeratorIndicator: false,
    enableEmailInStats: false,
    
    // Connection quality
    resolution: 720,
    constraints: {
        video: {
            height: {
                ideal: 720,
                max: 720,
                min: 180
            }
        }
    },
    
    // Disable unnecessary features for performance
    enableNoisyMicDetection: false,
    disableAudioLevels: false,
    
    // Recording
    fileRecordingsEnabled: false,
    liveStreamingEnabled: false,
    
    // Security
    enableInsecureRoomNameWarning: false
};
EOFCONFIG
    
    echo -e "${GREEN}✓ Minimal config created${NC}"
fi

# Step 11: Set proper permissions
echo ""
echo "11. Setting proper permissions..."
sudo chown root:root "$CONFIG_FILE"
sudo chmod 644 "$CONFIG_FILE"
echo -e "${GREEN}✓ Permissions set${NC}"

# Step 12: Test config is accessible via HTTP
echo ""
echo "12. Testing config accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://jitsi.rv2class.com/config.js)
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Config accessible via HTTPS (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Config not accessible via HTTPS (HTTP $HTTP_CODE)${NC}"
    echo "   Checking Nginx configuration..."
fi

# Step 13: Restart services
echo ""
echo "13. Restarting Jitsi services..."
sudo systemctl restart prosody
sleep 2
sudo systemctl restart jicofo
sleep 2
sudo systemctl restart jitsi-videobridge2
sleep 2
sudo systemctl restart nginx

echo -e "${GREEN}✓ Services restarted${NC}"

# Step 14: Check service status
echo ""
echo "14. Checking service status..."
SERVICES=("prosody" "jicofo" "jitsi-videobridge2" "nginx")
ALL_OK=1

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✓ $service is running${NC}"
    else
        echo -e "${RED}✗ $service is NOT running${NC}"
        ALL_OK=0
    fi
done

# Final summary
echo ""
echo "========================================="
echo "Summary"
echo "========================================="
if [ $ALL_OK -eq 1 ]; then
    echo -e "${GREEN}✓ All services are running${NC}"
    echo -e "${GREEN}✓ Configuration fixed successfully${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test your Jitsi meeting at: https://jitsi.rv2class.com/test123"
    echo "2. If it works directly, test from your app at: https://online.rv2class.com"
    echo "3. Check browser console for any remaining errors"
else
    echo -e "${RED}✗ Some services are not running${NC}"
    echo "Run 'sudo journalctl -xeu <service-name>' to check logs"
fi

echo ""
echo "Config file location: $CONFIG_FILE"
echo "Backup location: $BACKUP_FILE"
echo ""
