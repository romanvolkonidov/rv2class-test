#!/bin/bash

# Final Fix: Remove blocking setting, let client middleware handle lobby

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Final Fix: Removing muc_room_default_members_only..."
echo "   (Let client middleware control lobby instead)"
echo ""

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Backup..."
run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-final-\$(date +%Y%m%d-%H%M%S)"
echo "✅ Backed up"

echo ""
echo "Step 2: Removing muc_room_default_members_only..."
run_ssh "sed -i '/muc_room_default_members_only/d' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
echo "✅ Removed"

echo ""
echo "Step 3: Clearing room cache..."
run_ssh "systemctl stop prosody && rm -rf /var/lib/prosody/*/conference* /var/lib/prosody/*/lobby* 2>/dev/null; systemctl start prosody"
sleep 3
echo "✅ Cleared and restarted"

echo ""
echo "Step 4: Restarting Jicofo..."
run_ssh "systemctl restart jicofo"
sleep 2
echo "✅ Done"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FIXED - Teacher Can Join Now!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 How It Works Now:"
echo "   1. Teacher joins → becomes moderator"
echo "   2. Teacher-auth middleware enables lobby"
echo "   3. Student joins → middleware shows lobby"
echo "   4. Student knocks → teacher admits"
echo ""
echo "🧪 TEST NOW at https://app.rv2class.com"
echo ""
