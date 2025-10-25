#!/bin/bash

# Reset to Jitsi Default Lobby Configuration
# Remove all custom modifications and use standard Jitsi lobby

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔄 Resetting to Jitsi default lobby configuration..."
echo ""

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Backing up current configuration..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-default-$TIMESTAMP"
run_ssh "cp /etc/jitsi/jicofo/jicofo.conf /etc/jitsi/jicofo/jicofo.conf.backup-default-$TIMESTAMP"
echo "✅ Backups created"

echo ""
echo "Step 2: Enabling auto-owner in Jicofo (Jitsi default)..."
run_ssh "sed -i 's/enable-auto-owner: false/enable-auto-owner: true/' /etc/jitsi/jicofo/jicofo.conf"
echo "✅ enable-auto-owner: true"

echo ""
echo "Step 3: Removing custom room defaults from Prosody..."
run_ssh "sed -i '/muc_room_default_members_only/d' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
run_ssh "sed -i '/muc_room_default_public/d' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
echo "✅ Custom defaults removed"

echo ""
echo "Step 4: Keeping muc_lobby_rooms module (standard Jitsi)..."
if run_ssh "grep -q 'muc_lobby_rooms' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"; then
    echo "✅ muc_lobby_rooms module present"
else
    echo "⚠️  muc_lobby_rooms not found - adding it..."
    run_ssh "sed -i '/Component \"conference.app.rv2class.com\"/,/modules_enabled = {/ {
        /modules_enabled = {/a\\        \"muc_lobby_rooms\";
    }' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
fi

echo ""
echo "Step 5: Removing custom grant_teacher_role module..."
if run_ssh "grep -q 'grant_teacher_role' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"; then
    run_ssh "sed -i '/grant_teacher_role/d' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
    echo "✅ Custom teacher module removed"
else
    echo "✅ No custom teacher module found"
fi

echo ""
echo "Step 6: Verifying configuration..."
echo ""
echo "Jicofo:"
run_ssh "grep 'enable-auto-owner' /etc/jitsi/jicofo/jicofo.conf"
echo ""
echo "Prosody conference component:"
run_ssh "grep -A 8 'Component \"conference.app.rv2class.com\"' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua | head -10"

echo ""
echo "Step 7: Validating Prosody config..."
run_ssh "prosodyctl check config" || echo "⚠️  Some warnings (may be normal)"

echo ""
echo "Step 8: Restarting services..."
run_ssh "systemctl restart prosody"
sleep 2
run_ssh "systemctl restart jicofo"
sleep 2

if run_ssh "systemctl is-active --quiet prosody" && run_ssh "systemctl is-active --quiet jicofo"; then
    echo "✅ All services restarted successfully"
else
    echo "❌ Service restart failed!"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Reset to Jitsi Default Lobby Configuration!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration Summary:"
echo "   ✅ enable-auto-owner: true (first person = moderator)"
echo "   ✅ muc_lobby_rooms: enabled (lobby functionality)"
echo "   ✅ No forced lobby by default"
echo "   ✅ No custom teacher modules"
echo ""
echo "🎯 How It Works (Jitsi Default):"
echo "   1. First person joins → becomes moderator automatically"
echo "   2. Moderator clicks 'Security Options' → 'Enable Lobby'"
echo "   3. Future joiners → held in lobby"
echo "   4. Moderator sees notifications → admits students"
echo ""
echo "⚠️  Important:"
echo "   • Teacher MUST join first to become moderator"
echo "   • Teacher MUST enable lobby manually via UI"
echo "   • OR use lobby password for all meetings"
echo ""
echo "📝 Client Changes Needed:"
echo "   • Remove teacher-auth middleware blocking logic"
echo "   • Just let everyone join normally"
echo "   • Server handles everything"
echo ""
