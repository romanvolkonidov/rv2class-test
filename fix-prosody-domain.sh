#!/bin/bash

# Fix Prosody Lobby Domain Configuration

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Fixing Prosody lobby domain configuration..."

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Removing duplicate lobby configuration with wrong domain..."
run_ssh "sed -i '/Component \"conference.meet.jitsi\" \"muc\"/,/Component \"internal.auth.meet.jitsi\" \"muc\"/d' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"

echo "Step 2: Ensuring lobby.app.rv2class.com component exists..."
if ! run_ssh "grep -q 'Component \"lobby.app.rv2class.com\"' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"; then
    echo "Adding lobby component with correct domain..."
    
    cat > /tmp/correct_lobby.lua << 'EOF'

-- Lobby room component for student waiting room
Component "lobby.app.rv2class.com" "muc"
    storage = "memory"
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
    }
    muc_room_locking = false
    muc_room_default_public_jids = true
    muc_room_default_members_only = false
EOF
    
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no /tmp/correct_lobby.lua root@45.77.76.123:/tmp/
    run_ssh "cat /tmp/correct_lobby.lua >> /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
    rm /tmp/correct_lobby.lua
    echo "✅ Lobby component added with correct domain"
else
    echo "✅ Lobby component already exists"
fi

echo "Step 3: Restarting Prosody..."
run_ssh "systemctl restart prosody"
sleep 2

if run_ssh "systemctl is-active --quiet prosody"; then
    echo "✅ Prosody restarted successfully"
else
    echo "❌ Prosody failed - check logs"
    exit 1
fi

echo "Step 4: Restarting Jicofo..."
run_ssh "systemctl restart jicofo" || true

echo ""
echo "✅ Configuration fixed!"
echo ""
echo "📋 Current lobby configuration:"
run_ssh "grep -E 'lobby_muc|Component.*lobby' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua | grep -v '^--'"
echo ""
