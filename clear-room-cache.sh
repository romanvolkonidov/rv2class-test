#!/bin/bash

# Clear Existing Rooms and Force Lobby Defaults

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Clearing existing MUC rooms to force recreation with lobby enabled..."
echo ""

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Stopping Prosody to clear room cache..."
run_ssh "systemctl stop prosody"
sleep 2

echo "Step 2: Clearing MUC storage (rooms will be recreated with new defaults)..."
# Prosody stores MUC rooms in memory by default, but let's clear any persistent data
run_ssh "rm -rf /var/lib/prosody/*/conference* 2>/dev/null || true"
run_ssh "rm -rf /var/lib/prosody/*/lobby* 2>/dev/null || true"
echo "✅ Room cache cleared"

echo ""
echo "Step 3: Verifying Prosody configuration..."
echo "Conference component settings:"
run_ssh "grep -A 5 'Component \"conference.app.rv2class.com\"' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua | head -7"

echo ""
echo "Step 4: Starting Prosody..."
run_ssh "systemctl start prosody"
sleep 3

if run_ssh "systemctl is-active --quiet prosody"; then
    echo "✅ Prosody started successfully"
else
    echo "❌ Prosody failed to start!"
    exit 1
fi

echo ""
echo "Step 5: Restarting Jicofo..."
run_ssh "systemctl restart jicofo"
sleep 2

if run_ssh "systemctl is-active --quiet jicofo"; then
    echo "✅ Jicofo restarted successfully"
else
    echo "❌ Jicofo failed!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Room Cache Cleared!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 What Changed:"
echo "   • All existing rooms deleted"
echo "   • New rooms will be created with lobby enabled by default"
echo "   • muc_room_default_members_only = true will now apply"
echo ""
echo "⚠️  IMPORTANT: You MUST deploy the updated frontend!"
echo ""
echo "   The client middleware is OLD and trying to enable lobby manually."
echo "   You need to rebuild and deploy the fixed version."
echo ""
echo "📋 Next Steps:"
echo "   1. Run: ./quick-deploy-lobby.sh"
echo "   2. Test: Visit https://app.rv2class.com/static/student-welcome.html"
echo "   3. Check logs: Should see 'Is members-only (lobby)?: true'"
echo ""
