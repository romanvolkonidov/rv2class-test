#!/bin/bash

# Comprehensive Jitsi Server Fix Script
# Run this on your Jitsi server (jitsi.rv2class.com) via SSH

set -e

echo "======================================"
echo "Jitsi Server Configuration Fix"
echo "======================================"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" 
   exit 1
fi

# Backup configurations
echo "1. Creating backups..."
BACKUP_DIR="/root/jitsi-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp /etc/jitsi/meet/*.js "$BACKUP_DIR/" 2>/dev/null || true
cp /etc/nginx/sites-available/jitsi.rv2class.com.conf "$BACKUP_DIR/" 2>/dev/null || true
echo "   Backups saved to: $BACKUP_DIR"
echo ""

# Fix config.js
echo "2. Fixing /etc/jitsi/meet/jitsi.rv2class.com-config.js..."
CONFIG_FILE="/etc/jitsi/meet/jitsi.rv2class.com-config.js"

# Fix the broken BOSH URL
perl -i -pe 's|bosh: .https://jitsi\.rv2class\.com/. \+ subdir \+ .htt.*?\n.*?p-bind.,|bosh: "https://jitsi.rv2class.com/http-bind",|gs' "$CONFIG_FILE"

# Fix the broken WebSocket URL
perl -i -pe 's|websocket: .wss://jitsi\.rv2class\.com/. \+ subdir \+ .*?\n.*?xmpp-websocket.,|websocket: "wss://jitsi.rv2class.com/xmpp-websocket",|gs' "$CONFIG_FILE"

# Also check if they're using single string concatenation and fix those
sed -i "s|'https://jitsi.rv2class.com/' + subdir + 'http-bind'|'https://jitsi.rv2class.com/http-bind'|g" "$CONFIG_FILE"
sed -i "s|'wss://jitsi.rv2class.com/' + subdir + 'xmpp-websocket'|'wss://jitsi.rv2class.com/xmpp-websocket'|g" "$CONFIG_FILE"

echo "   ✓ config.js URLs fixed"
echo ""

# Verify the fix
echo "3. Verifying fixes..."
if grep -q "bosh: 'https://jitsi.rv2class.com/http-bind'" "$CONFIG_FILE" || \
   grep -q 'bosh: "https://jitsi.rv2class.com/http-bind"' "$CONFIG_FILE"; then
    echo "   ✓ BOSH URL is correct"
else
    echo "   ⚠ BOSH URL may need manual correction"
fi

if grep -q "websocket: 'wss://jitsi.rv2class.com/xmpp-websocket'" "$CONFIG_FILE" || \
   grep -q 'websocket: "wss://jitsi.rv2class.com/xmpp-websocket"' "$CONFIG_FILE"; then
    echo "   ✓ WebSocket URL is correct"
else
    echo "   ⚠ WebSocket URL may need manual correction"
fi
echo ""

# Check Prosody configuration
echo "4. Checking Prosody (XMPP server)..."
systemctl is-active --quiet prosody && echo "   ✓ Prosody is running" || echo "   ✗ Prosody is NOT running"

# Check if WebSocket is enabled in Prosody
PROSODY_CONFIG="/etc/prosody/conf.avail/jitsi.rv2class.com.cfg.lua"
if [ -f "$PROSODY_CONFIG" ]; then
    if grep -q "consider_websocket_secure" "$PROSODY_CONFIG"; then
        echo "   ✓ WebSocket module is configured"
    else
        echo "   ℹ Adding WebSocket security configuration..."
        # Add WebSocket security if not present
        if ! grep -q "consider_websocket_secure" "$PROSODY_CONFIG"; then
            sed -i '/VirtualHost "jitsi.rv2class.com"/a\    consider_websocket_secure = true;' "$PROSODY_CONFIG"
        fi
    fi
fi
echo ""

# Check Nginx configuration
echo "5. Checking Nginx WebSocket proxy..."
NGINX_CONFIG="/etc/nginx/sites-available/jitsi.rv2class.com.conf"
if [ -f "$NGINX_CONFIG" ]; then
    if grep -q "xmpp-websocket" "$NGINX_CONFIG"; then
        echo "   ✓ WebSocket proxy is configured"
    else
        echo "   ⚠ WebSocket proxy configuration may be missing"
    fi
fi
echo ""

# Restart services
echo "6. Restarting Jitsi services..."
echo "   Restarting Prosody..."
systemctl restart prosody
sleep 2

echo "   Restarting Jicofo..."
systemctl restart jicofo
sleep 2

echo "   Restarting JVB..."
systemctl restart jitsi-videobridge2
sleep 2

echo "   Restarting Nginx..."
systemctl restart nginx
sleep 2

echo "   ✓ All services restarted"
echo ""

# Final status check
echo "7. Service Status:"
systemctl is-active --quiet prosody && echo "   ✓ Prosody: RUNNING" || echo "   ✗ Prosody: FAILED"
systemctl is-active --quiet jicofo && echo "   ✓ Jicofo: RUNNING" || echo "   ✗ Jicofo: FAILED"
systemctl is-active --quiet jitsi-videobridge2 && echo "   ✓ JVB: RUNNING" || echo "   ✗ JVB: FAILED"
systemctl is-active --quiet nginx && echo "   ✓ Nginx: RUNNING" || echo "   ✗ Nginx: FAILED"
echo ""

echo "======================================"
echo "Fix Complete!"
echo "======================================"
echo ""
echo "Test your Jitsi connection at:"
echo "https://jitsi.rv2class.com"
echo ""
echo "If issues persist, check logs:"
echo "  sudo journalctl -u prosody -f"
echo "  sudo journalctl -u jicofo -f"
echo "  sudo journalctl -u jitsi-videobridge2 -f"
