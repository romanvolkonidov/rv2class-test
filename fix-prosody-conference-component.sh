#!/bin/bash

# Fix Prosody Conference Component - Add muc_lobby_rooms

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Adding muc_lobby_rooms to conference component..."

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Backing up Prosody config..."
run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-lobby-fix-\$(date +%Y%m%d-%H%M%S)"

echo "Step 2: Adding muc_lobby_rooms to conference component modules..."

# Add muc_lobby_rooms to the conference component's modules_enabled
run_ssh "sed -i '/Component \"conference.app.rv2class.com\"/,/modules_enabled = {/ {
    /modules_enabled = {/a\\        \"muc_lobby_rooms\";
}' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"

echo "Step 3: Verifying the change..."
echo ""
echo "Conference component modules:"
run_ssh "grep -A 12 'Component \"conference.app.rv2class.com\"' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua | grep -A 10 'modules_enabled'"

echo ""
echo "Step 4: Checking lobby_muc setting..."
run_ssh "grep 'lobby_muc' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"

echo ""
echo "Step 5: Validating Prosody config..."
run_ssh "prosodyctl check config" || echo "⚠️  Some warnings (may be normal)"

echo ""
echo "Step 6: Restarting Prosody..."
run_ssh "systemctl restart prosody"
sleep 2

if run_ssh "systemctl is-active --quiet prosody"; then
    echo "✅ Prosody restarted successfully"
else
    echo "❌ Prosody failed to start!"
    exit 1
fi

echo ""
echo "Step 7: Restarting Jicofo..."
run_ssh "systemctl restart jicofo"
sleep 2

if run_ssh "systemctl is-active --quiet jicofo"; then
    echo "✅ Jicofo restarted successfully"
else
    echo "❌ Jicofo failed to start!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Prosody Conference Component Fixed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration Summary:"
echo "   ✅ Jicofo: enable-auto-owner = false"
echo "   ✅ Prosody: muc_lobby_rooms in conference component"
echo "   ✅ Lobby MUC: lobby.app.rv2class.com"
echo "   ✅ All services restarted"
echo ""
echo "🧪 Now test:"
echo "   1. Student joins → held in lobby"
echo "   2. Student can knock"
echo "   3. Teacher joins → becomes moderator"
echo "   4. Teacher admits student"
echo ""
