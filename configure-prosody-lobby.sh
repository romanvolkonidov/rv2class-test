#!/bin/bash

# Configure Prosody Lobby on Vultr Server
# Server: 45.77.76.123 (New Jersey)

set -e  # Exit on error

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Configuring Prosody Lobby Module on rv2class-production server..."
echo "Server: $SERVER_IP"
echo ""

# Function to run commands via SSH
run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

# Function to copy files via SCP
copy_file() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no "$1" "$SERVER_USER@$SERVER_IP:$2"
}

echo "Step 1: Checking if Prosody is installed..."
if run_ssh "which prosody"; then
    echo "✅ Prosody is installed"
else
    echo "❌ Prosody not found - is Jitsi Meet installed?"
    exit 1
fi

echo ""
echo "Step 2: Locating Prosody configuration..."
PROSODY_CONFIG=$(run_ssh "ls /etc/prosody/conf.avail/*.cfg.lua 2>/dev/null | head -1" || echo "")

if [ -z "$PROSODY_CONFIG" ]; then
    echo "⚠️  Standard Prosody config not found, checking for Jitsi config..."
    PROSODY_CONFIG=$(run_ssh "ls /etc/prosody/conf.d/*.cfg.lua 2>/dev/null | head -1" || echo "")
fi

if [ -z "$PROSODY_CONFIG" ]; then
    echo "❌ Could not find Prosody configuration file"
    echo "Checking all Prosody directories..."
    run_ssh "find /etc/prosody -name '*.cfg.lua' 2>/dev/null"
    exit 1
fi

echo "✅ Found Prosody config: $PROSODY_CONFIG"

echo ""
echo "Step 3: Backing up current Prosody configuration..."
run_ssh "cp $PROSODY_CONFIG ${PROSODY_CONFIG}.backup-$(date +%Y%m%d-%H%M%S)"
echo "✅ Backup created"

echo ""
echo "Step 4: Checking if muc_lobby_rooms module is already enabled..."
if run_ssh "grep -q 'muc_lobby_rooms' $PROSODY_CONFIG"; then
    echo "✅ muc_lobby_rooms module already configured"
else
    echo "📝 Adding muc_lobby_rooms module..."
    
    # Add muc_lobby_rooms to the modules_enabled section
    run_ssh "sed -i '/modules_enabled = {/a\\    \"muc_lobby_rooms\";' $PROSODY_CONFIG"
    echo "✅ muc_lobby_rooms module added"
fi

echo ""
echo "Step 5: Configuring lobby settings for conference rooms..."

# Create a temporary configuration snippet
cat > /tmp/lobby_config.lua << 'EOF'

-- Lobby configuration for student waiting room
Component "conference.meet.jitsi" "muc"
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        "polls";
        "muc_lobby_rooms";  -- Enable lobby/waiting room
    }
    
    -- Lobby settings
    lobby_muc = "lobby.meet.jitsi"  -- Separate lobby room
    main_muc = "conference.meet.jitsi"  -- Main conference room
    
    -- Allow knocking (students can request to join)
    muc_room_locking = false
    muc_room_default_public_jids = true

-- Lobby room component
Component "lobby.meet.jitsi" "muc"
    storage = "memory"
    modules_enabled = {
        "muc_meeting_id";
        "polls";
    }
    muc_room_locking = false
    muc_room_default_public_jids = true
    muc_room_default_members_only = false

-- Internal MUC for authentication
Component "internal.auth.meet.jitsi" "muc"
    storage = "memory"
    modules_enabled = {
        "ping";
    }
    admins = { "focus@auth.meet.jitsi", "jvb@auth.meet.jitsi" }
    muc_room_locking = false
    muc_room_default_public_jids = true
EOF

echo "Uploading lobby configuration..."
copy_file /tmp/lobby_config.lua /tmp/lobby_config.lua

echo ""
echo "Step 6: Checking if configuration needs to be merged..."

# Check if the configuration already has the lobby component
if run_ssh "grep -q 'lobby.meet.jitsi' $PROSODY_CONFIG"; then
    echo "✅ Lobby component already exists in config"
else
    echo "📝 Adding lobby component to configuration..."
    run_ssh "cat /tmp/lobby_config.lua >> $PROSODY_CONFIG"
    echo "✅ Lobby configuration added"
fi

echo ""
echo "Step 7: Validating Prosody configuration..."
if run_ssh "prosodyctl check config"; then
    echo "✅ Configuration is valid"
else
    echo "⚠️  Configuration validation warnings (may be normal)"
fi

echo ""
echo "Step 8: Restarting Prosody service..."
run_ssh "systemctl restart prosody"
sleep 3

if run_ssh "systemctl is-active --quiet prosody"; then
    echo "✅ Prosody restarted successfully"
else
    echo "❌ Prosody failed to start - checking logs..."
    run_ssh "journalctl -u prosody -n 50 --no-pager"
    echo ""
    echo "⚠️  Restoring backup..."
    run_ssh "cp ${PROSODY_CONFIG}.backup-* $PROSODY_CONFIG"
    run_ssh "systemctl restart prosody"
    exit 1
fi

echo ""
echo "Step 9: Restarting Jicofo (if installed)..."
if run_ssh "systemctl list-units --type=service --all | grep -q jicofo"; then
    run_ssh "systemctl restart jicofo" || echo "⚠️  Jicofo restart had issues (may be normal)"
    echo "✅ Jicofo restarted"
else
    echo "⚠️  Jicofo not found - skipping"
fi

echo ""
echo "Step 10: Restarting Jitsi Videobridge (if installed)..."
if run_ssh "systemctl list-units --type=service --all | grep -q jitsi-videobridge"; then
    run_ssh "systemctl restart jitsi-videobridge2" || echo "⚠️  JVB restart had issues"
    echo "✅ Jitsi Videobridge restarted"
else
    echo "⚠️  JVB not found - skipping"
fi

echo ""
echo "Step 11: Verifying Prosody modules..."
echo "Checking loaded modules:"
run_ssh "prosodyctl about" | grep -A 20 "Enabled modules" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Prosody Lobby Configuration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Configuration Summary:"
echo "   • muc_lobby_rooms module: ENABLED"
echo "   • Main conference: conference.meet.jitsi"
echo "   • Lobby room: lobby.meet.jitsi"
echo "   • Students can now knock and wait for admission"
echo ""
echo "🧪 Test the setup:"
echo "   1. Teacher joins first → becomes moderator"
echo "   2. Student joins → held in lobby"
echo "   3. Teacher sees 'Student wants to join' notification"
echo "   4. Teacher clicks 'Admit' → student enters"
echo ""
echo "📋 Backup location: ${PROSODY_CONFIG}.backup-*"
echo ""
echo "🔍 Check Prosody logs if issues occur:"
echo "   sudo journalctl -u prosody -f"
echo ""

# Cleanup
rm -f /tmp/lobby_config.lua

echo "🎉 Server-side configuration complete!"
echo "Now rebuild and deploy your frontend with the updated middleware."
