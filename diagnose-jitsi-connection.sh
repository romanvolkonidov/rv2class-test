#!/bin/bash

echo "=== Jitsi Connection Diagnostics ==="
echo ""

# Check if Jitsi server is accessible
echo "1. Checking Jitsi server accessibility..."
curl -s -I https://jitsi.rv2class.com | head -5
echo ""

# Check external API
echo "2. Checking external API..."
curl -s -I https://jitsi.rv2class.com/external_api.js | head -3
echo ""

# Check WebSocket endpoint (XMPP BOSH)
echo "3. Checking XMPP BOSH endpoint..."
curl -s -I https://jitsi.rv2class.com/http-bind | head -5
echo ""

# Check if WebSocket is enabled
echo "4. Checking WebSocket endpoint..."
curl -s -I https://jitsi.rv2class.com/xmpp-websocket | head -5
echo ""

# Check config.js
echo "5. Checking Jitsi config.js for BOSH/WebSocket settings..."
curl -s https://jitsi.rv2class.com/config.js | grep -E "bosh|websocket|BOSH|WEBSOCKET" | head -10
echo ""

echo "=== Diagnostics Complete ==="
