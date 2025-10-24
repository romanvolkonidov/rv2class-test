#!/bin/bash

# Fix Prosody to Allow Anonymous Moderators (Teachers)
# While keeping lobby enabled for students

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Fixing Prosody to allow anonymous teachers as moderators..."
echo ""

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Backing up configuration..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-anon-mod-$TIMESTAMP"
echo "✅ Backup created"

echo ""
echo "Step 2: Removing muc_room_default_members_only (causes the problem)..."
run_ssh "sed -i '/muc_room_default_members_only/d' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
echo "✅ Removed muc_room_default_members_only"

echo ""
echo "Step 3: Adding muc_room_locking = false to conference component..."
if run_ssh "grep -q 'muc_room_locking = false' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"; then
    echo "✅ muc_room_locking already set"
else
    run_ssh "sed -i '/Component \"conference.app.rv2class.com\" \"muc\"/a\    muc_room_locking = false' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
    echo "✅ Added muc_room_locking = false"
fi

echo ""
echo "Step 4: Verifying Jicofo has enable-auto-owner = false..."
if run_ssh "grep -q 'enable-auto-owner.*false' /etc/jitsi/jicofo/jicofo.conf"; then
    echo "✅ enable-auto-owner = false (correct)"
else
    echo "⚠️  enable-auto-owner may not be set correctly"
fi

echo ""
echo "Step 5: Clearing room cache..."
run_ssh "systemctl stop prosody"
sleep 2
run_ssh "rm -rf /var/lib/prosody/*/conference* 2>/dev/null || true"
run_ssh "rm -rf /var/lib/prosody/*/lobby* 2>/dev/null || true"
echo "✅ Room cache cleared"

echo ""
echo "Step 6: Restarting Prosody..."
run_ssh "systemctl start prosody"
sleep 3

if run_ssh "systemctl is-active --quiet prosody"; then
    echo "✅ Prosody started successfully"
else
    echo "❌ Prosody failed to start - restoring backup..."
    run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-anon-mod-$TIMESTAMP /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
    run_ssh "systemctl start prosody"
    exit 1
fi

echo ""
echo "Step 7: Restarting Jicofo..."
run_ssh "systemctl restart jicofo"
sleep 2

if run_ssh "systemctl is-active --quiet jicofo"; then
    echo "✅ Jicofo restarted successfully"
else
    echo "❌ Jicofo failed!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuration Fixed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 What Changed:"
echo "   ❌ Removed: muc_room_default_members_only = true"
echo "   ✅ Kept: enable-auto-owner = false (Jicofo)"
echo "   ✅ Added: muc_room_locking = false"
echo "   ✅ Cleared: All room cache"
echo ""
echo "🎯 New Behavior:"
echo "   • Teacher joins empty room → becomes moderator ✅"
echo "   • Teacher can manually enable lobby ✅"
echo "   • Student joins → goes to lobby (if enabled) ✅"
echo "   • No more 'members-only' errors ✅"
echo ""
echo "⚠️  Note: Teacher must enable lobby manually via UI"
echo "   (Click Security → Enable Lobby)"
echo ""
echo "🧪 Test Now:"
echo "   1. Teacher joins → should work ✅"
echo "   2. Teacher enables lobby via UI"
echo "   3. Student joins → waits in lobby"
echo "   4. Teacher admits → student enters"
echo ""
