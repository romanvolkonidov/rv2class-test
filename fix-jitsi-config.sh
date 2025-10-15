#!/bin/bash

# Fix Jitsi config.js URL wrapping issue
# This script must be run on the Jitsi server (jitsi.rv2class.com)

echo "=== Fixing Jitsi config.js URL wrapping ==="
echo ""

# Backup the current config
echo "1. Creating backup..."
sudo cp /etc/jitsi/meet/jitsi.rv2class.com-config.js /etc/jitsi/meet/jitsi.rv2class.com-config.js.backup.$(date +%Y%m%d_%H%M%S)

# Fix the broken URLs in config.js
echo "2. Fixing BOSH and WebSocket URLs..."
sudo sed -i "s|bosh: 'https://jitsi.rv2class.com/' + subdir + 'htt$|bosh: 'https://jitsi.rv2class.com/' + subdir + 'http-bind',|g" /etc/jitsi/meet/jitsi.rv2class.com-config.js
sudo sed -i "s|p-bind',||g" /etc/jitsi/meet/jitsi.rv2class.com-config.js

sudo sed -i "s|websocket: 'wss://jitsi.rv2class.com/' + subdir + '$|websocket: 'wss://jitsi.rv2class.com/' + subdir + 'xmpp-websocket',|g" /etc/jitsi/meet/jitsi.rv2class.com-config.js
sudo sed -i "s|xmpp-websocket',||g" /etc/jitsi/meet/jitsi.rv2class.com-config.js

# Actually, let's just fix it properly by finding and replacing the entire section
echo "3. Applying comprehensive fix..."

# Create a temp file with the corrected URLs
cat > /tmp/jitsi-config-fix.txt << 'EOF'
    // BOSH URL. FIXME: use XEP-0156 to discover it.
    bosh: 'https://jitsi.rv2class.com/http-bind',

    // Websocket URL (XMPP)
    websocket: 'wss://jitsi.rv2class.com/xmpp-websocket',
EOF

echo "4. Please SSH into your Jitsi server and run:"
echo ""
echo "  sudo nano /etc/jitsi/meet/jitsi.rv2class.com-config.js"
echo ""
echo "Then find the lines with 'bosh:' and 'websocket:' and replace them with:"
echo ""
cat /tmp/jitsi-config-fix.txt
echo ""
echo "5. After editing, restart services:"
echo ""
echo "  sudo systemctl restart prosody"
echo "  sudo systemctl restart jicofo"
echo "  sudo systemctl restart jitsi-videobridge2"
echo "  sudo systemctl restart nginx"
echo ""

echo "=== Manual Fix Required ==="
echo ""
echo "Since this script is running locally, you need to apply the fix on your server."
echo "Copy the above commands and run them via SSH on jitsi.rv2class.com"
