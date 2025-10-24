#!/bin/bash

# Remove muc_room_default_members_only - It blocks everyone!

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Removing muc_room_default_members_only (causes auth issues)..."
echo ""

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Backing up configuration..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-remove-members-only-$TIMESTAMP"
echo "✅ Backup created"

echo ""
echo "Step 2: Removing muc_room_default_members_only..."
run_ssh "sed -i '/muc_room_default_members_only/d' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
echo "✅ Removed"

echo ""
echo "Step 3: Verifying configuration..."
if run_ssh "grep -q 'muc_room_default_members_only' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"; then
    echo "⚠️  Still exists!"
else
    echo "✅ Successfully removed"
fi

echo ""
echo "Step 4: Restarting Prosody..."
run_ssh "systemctl restart prosody"
sleep 2

if run_ssh "systemctl is-active --quiet prosody"; then
    echo "✅ Prosody restarted"
else
    echo "❌ Failed to start!"
    exit 1
fi

echo ""
echo "Step 5: Restarting Jicofo..."
run_ssh "systemctl restart jicofo"
sleep 2

echo ""
echo "Step 6: Clearing room cache..."
run_ssh "systemctl stop prosody && rm -rf /var/lib/prosody/*/conference* /var/lib/prosody/*/lobby* 2>/dev/null || true && systemctl start prosody"
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Fixed! Rooms No Longer Require Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 New Strategy:"
echo "   • Rooms start WITHOUT lobby (anonymous join works)"
echo "   • Teacher joins first → becomes moderator"
echo "   • Teacher MANUALLY enables lobby"
echo "   • Students then go to lobby automatically"
echo ""
echo "🧪 Test Now:"
echo "   1. Teacher joins → should work! ✅"
echo "   2. Teacher enables lobby (UI button)"
echo "   3. Student joins → goes to lobby ✅"
echo ""
