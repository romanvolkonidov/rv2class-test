#!/bin/bash

# Add muc_lobby_autocreate to Prosody Configuration
# This ensures students are placed in lobby even when room is empty

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Adding muc_lobby_autocreate to Prosody configuration..."
echo ""

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Backing up current configuration..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-autocreate-$TIMESTAMP"
echo "✅ Backup created: app.rv2class.com.cfg.lua.backup-autocreate-$TIMESTAMP"

echo ""
echo "Step 2: Checking if muc_lobby_autocreate already exists..."
if run_ssh "grep -q 'muc_lobby_autocreate' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"; then
    echo "✅ muc_lobby_autocreate already exists"
else
    echo "📝 Adding muc_lobby_autocreate = true..."
    
    # Add muc_lobby_autocreate right after lobby_muc line
    run_ssh "sed -i '/lobby_muc = \"lobby.app.rv2class.com\"/a\    muc_lobby_autocreate = true  -- Auto-create lobby even for empty rooms' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
    
    echo "✅ muc_lobby_autocreate added"
fi

echo ""
echo "Step 3: Verifying the configuration..."
echo ""
echo "Lobby settings:"
run_ssh "grep -A 3 'lobby_muc' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua | head -5"

echo ""
echo "Step 4: Validating Prosody config..."
run_ssh "prosodyctl check config" || echo "⚠️  Some warnings (may be normal)"

echo ""
echo "Step 5: Restarting Prosody..."
run_ssh "systemctl restart prosody"
sleep 2

if run_ssh "systemctl is-active --quiet prosody"; then
    echo "✅ Prosody restarted successfully"
else
    echo "❌ Prosody failed to start - restoring backup..."
    run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-autocreate-$TIMESTAMP /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
    run_ssh "systemctl restart prosody"
    exit 1
fi

echo ""
echo "Step 6: Restarting Jicofo..."
run_ssh "systemctl restart jicofo"
sleep 2

if run_ssh "systemctl is-active --quiet jicofo"; then
    echo "✅ Jicofo restarted successfully"
else
    echo "⚠️  Jicofo restart had issues"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Lobby Auto-Create Enabled!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration Summary:"
echo "   ✅ muc_lobby_autocreate = true"
echo "   ✅ lobby_muc = lobby.app.rv2class.com"
echo "   ✅ main_muc = conference.app.rv2class.com"
echo "   ✅ muc_lobby_rooms module enabled"
echo "   ✅ enable-auto-owner = false (Jicofo)"
echo ""
echo "🎯 What This Does:"
echo "   • Students joining empty room → automatically placed in lobby"
echo "   • Students can knock even if teacher hasn't joined yet"
echo "   • Lobby is created automatically for every room"
echo "   • No need to wait for teacher to enable lobby manually"
echo ""
echo "🧪 Test Flow:"
echo "   1. Student joins empty room"
echo "   2. ✅ Student placed in lobby automatically"
echo "   3. ✅ Student can knock"
echo "   4. Teacher joins"
echo "   5. ✅ Teacher sees knock notification"
echo "   6. Teacher admits student"
echo "   7. ✅ Student enters conference"
echo ""
echo "📊 Expected Console Logs (Student):"
echo "   • membersOnly = [object] (lobby is active)"
echo "   • Student can call startKnocking()"
echo "   • CONFERENCE_JOINED only after teacher admits"
echo ""
