#!/bin/bash

# Final fix for Jitsi WebSocket URL
# Run this on your Jitsi server

set -e

echo "=== Fixing Jitsi WebSocket URL ==="

CONFIG_FILE="/etc/jitsi/meet/jitsi.rv2class.com-config.js"

# Backup
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# Fix the websocket line that's split across two lines
# Remove any newline in the middle of the websocket URL
sed -i ':a;N;$!ba;s/websocket: .wss:\/\/jitsi\.rv2class\.com\/xmpp-websocket\n.,/websocket: '\''wss:\/\/jitsi.rv2class.com\/xmpp-websocket'\'',/g' "$CONFIG_FILE"

# Also try a simpler approach - replace any broken websocket line
sed -i "s|websocket: 'wss://jitsi.rv2class.com/xmpp-websocket.*|websocket: 'wss://jitsi.rv2class.com/xmpp-websocket',|g" "$CONFIG_FILE"

# Remove any trailing newline artifacts
sed -i '/^$/d' "$CONFIG_FILE"

echo "✓ Config fixed"

# Restart services
echo "Restarting services..."
systemctl restart prosody
systemctl restart jicofo  
systemctl restart jitsi-videobridge2
systemctl restart nginx

echo "✓ Done!"
echo ""
echo "Test at: https://jitsi.rv2class.com"
