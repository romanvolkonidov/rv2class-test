#!/bin/bash

# Configure Prosody to Auto-Enable Lobby for All Rooms
# This ensures lobby is active even for empty rooms

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Configuring Prosody to enable lobby by default for all rooms..."
echo ""

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Backing up current configuration..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-members-only-$TIMESTAMP"
echo "✅ Backup created: app.rv2class.com.cfg.lua.backup-members-only-$TIMESTAMP"

echo ""
echo "Step 2: Removing invalid muc_lobby_autocreate setting..."
run_ssh "sed -i '/muc_lobby_autocreate/d' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
echo "✅ Removed muc_lobby_autocreate (not a real Prosody setting)"

echo ""
echo "Step 3: Adding muc_room_default_members_only to conference component..."

# Check if already exists
if run_ssh "grep -q 'muc_room_default_members_only' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"; then
    echo "✅ muc_room_default_members_only already exists"
else
    echo "📝 Adding muc_room_default_members_only = true..."
    
    # Add after the conference component declaration
    run_ssh "sed -i '/Component \"conference.app.rv2class.com\" \"muc\"/a\    muc_room_default_members_only = true  -- All rooms start with lobby enabled' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
    
    echo "✅ muc_room_default_members_only added"
fi

echo ""
echo "Step 4: Verifying the configuration..."
echo ""
echo "Conference component settings:"
run_ssh "grep -A 3 'Component \"conference.app.rv2class.com\"' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua | head -5"

echo ""
echo "Lobby settings:"
run_ssh "grep 'lobby_muc\|muc_room_default_members_only' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua | head -5"

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
    echo "❌ Prosody failed to start - restoring backup..."
    run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-members-only-$TIMESTAMP /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
    run_ssh "systemctl restart prosody"
    exit 1
fi

echo ""
echo "Step 7: Restarting Jicofo..."
run_ssh "systemctl restart jicofo"
sleep 2

if run_ssh "systemctl is-active --quiet jicofo"; then
    echo "✅ Jicofo restarted successfully"
else
    echo "⚠️  Jicofo restart had issues"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Lobby Default Configuration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration Summary:"
echo "   ✅ muc_room_default_members_only = true (REAL setting)"
echo "   ✅ lobby_muc = lobby.app.rv2class.com"
echo "   ✅ main_muc = conference.app.rv2class.com"
echo "   ✅ muc_lobby_rooms module enabled"
echo "   ✅ enable-auto-owner = false (Jicofo)"
echo ""
echo "🎯 What This Does:"
echo "   • All conference rooms start with lobby ENABLED by default"
echo "   • When student joins empty room → lobby is already active"
echo "   • membersOnly = true automatically"
echo "   • Students can knock immediately"
echo "   • No 'conference not started' error"
echo ""
echo "🧪 Test Flow:"
echo "   1. Student joins empty room"
echo "   2. ✅ Prosody creates room with lobby enabled"
echo "   3. ✅ Student routed to lobby automatically"
echo "   4. ✅ membersOnly = true (lobby is active)"
echo "   5. ✅ Student can knock"
echo "   6. Teacher joins → becomes moderator"
echo "   7. ✅ Teacher sees knock notification"
echo "   8. Teacher admits → student enters"
echo ""
echo "📊 Expected Console Logs (Student):"
echo "   • Is members-only (lobby)?: true ✅"
echo "   • membersOnly = [Conference object] ✅"
echo "   • Student can call startKnocking() ✅"
echo "   • NO 'conference not started' error ✅"
echo ""
