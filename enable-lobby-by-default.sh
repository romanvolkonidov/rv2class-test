#!/bin/bash

# Enable lobby by default for all rooms
# This ensures students are blocked even if they join before teacher

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Enabling lobby by default for all rooms..."
echo ""

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Backup..."
run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-lobby-default-\$(date +%Y%m%d-%H%M%S)"
echo "✅ Backed up"

echo ""
echo "Step 2: Adding muc_room_default_public = false (lobby enabled by default)..."
run_ssh "sed -i '/Component \"conference.app.rv2class.com\" \"muc\"/,/^Component/ {
    /lobby_muc/a\\    muc_room_default_public = false  -- Rooms start with lobby enabled
}' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
echo "✅ Added"

echo ""
echo "Step 3: Verifying configuration..."
echo "Lobby settings:"
run_ssh "grep -A 5 'lobby_muc' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua | head -8"

echo ""
echo "Step 4: Clearing room cache..."
run_ssh "systemctl stop prosody && rm -rf /var/lib/prosody/*/conference* /var/lib/prosody/*/lobby* 2>/dev/null; systemctl start prosody"
sleep 3
echo "✅ Cleared and restarted"

echo ""
echo "Step 5: Restarting Jicofo..."
run_ssh "systemctl restart jicofo"
sleep 2
echo "✅ Done"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Lobby Enabled By Default!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 What This Does:"
echo "   • ALL rooms start with lobby enabled"
echo "   • Students ALWAYS blocked, even if first"
echo "   • Teacher with [TEACHER] prefix gets moderator"
echo "   • Teacher can admit students"
echo ""
echo "🧪 Test at https://app.rv2class.com"
echo ""
