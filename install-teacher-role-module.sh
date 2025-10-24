#!/bin/bash

# Install Custom Prosody Module to Grant Teacher Role
# This reads userType from display name and grants owner affiliation to teachers

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

echo "🔧 Installing Custom Teacher Role Module..."
echo ""

run_ssh() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "Step 1: Creating custom Prosody module..."
run_ssh "cat > /usr/share/jitsi-meet/prosody-plugins/mod_grant_teacher_role.lua << 'EOF'
-- mod_grant_teacher_role.lua
-- Grants owner affiliation to teachers based on display name prefix

local jid_bare = require \"util.jid\".bare;
local json = require \"util.json\";

module:log(\"info\", \"Loading mod_grant_teacher_role\");

-- Hook into room join to check for teacher
module:hook(\"muc-occupant-joined\", function(event)
    local room = event.room;
    local occupant = event.occupant;
    local session = event.origin;
    
    -- Log for debugging
    module:log(\"info\", \"User joining: %s\", occupant.nick);
    
    -- Check display name for teacher marker
    local displayName = occupant.nick or \"\";
    local bare_jid = jid_bare(occupant.bare_jid);
    
    -- Teacher detection: check if display name contains \"[TEACHER]\" prefix
    if displayName:match(\"%[TEACHER%]\") then
        module:log(\"info\", \"Teacher detected: %s - granting owner\", displayName);
        
        -- Grant owner affiliation
        room:set_affiliation(true, bare_jid, \"owner\", \"Teacher role granted\");
        
        -- Also set role to moderator immediately
        room:set_role(true, occupant.nick, \"moderator\", \"Teacher role granted\");
        
        module:log(\"info\", \"✅ Owner/moderator granted to teacher: %s\", bare_jid);
    else
        module:log(\"info\", \"Student detected: %s - no special privileges\", displayName);
    end
    
    return true;
end, 5);

module:log(\"info\", \"mod_grant_teacher_role loaded successfully\");
EOF
"
echo "✅ Module created"

echo ""
echo "Step 2: Backup Prosody config..."
run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-teacher-module-\$(date +%Y%m%d-%H%M%S)"
echo "✅ Backed up"

echo ""
echo "Step 3: Adding module to Prosody config..."
# Add to conference component modules
run_ssh "sed -i '/Component \"conference.app.rv2class.com\" \"muc\"/,/^Component/ {
    /modules_enabled = {/,/}/ {
        /\"muc_lobby_rooms\"/a\\        \"grant_teacher_role\";  -- Grant teacher role based on display name
    }
}' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
echo "✅ Module added to config"

echo ""
echo "Step 4: Verifying configuration..."
echo "Modules enabled:"
run_ssh "grep -A 10 'Component \"conference.app.rv2class.com\"' /etc/prosody/conf.avail/app.rv2class.com.cfg.lua | grep -A 5 modules_enabled"

echo ""
echo "Step 5: Testing Prosody config..."
run_ssh "prosodyctl check config" || echo "⚠️  Some warnings (may be normal)"

echo ""
echo "Step 6: Restarting Prosody..."
run_ssh "systemctl restart prosody"
sleep 3

if run_ssh "systemctl is-active --quiet prosody"; then
    echo "✅ Prosody restarted successfully"
else
    echo "❌ Prosody failed - restoring backup..."
    run_ssh "cp /etc/prosody/conf.avail/app.rv2class.com.cfg.lua.backup-teacher-module-* /etc/prosody/conf.avail/app.rv2class.com.cfg.lua"
    run_ssh "systemctl restart prosody"
    exit 1
fi

echo ""
echo "Step 7: Restarting Jicofo..."
run_ssh "systemctl restart jicofo"
sleep 2
echo "✅ Done"

echo ""
echo "Step 8: Checking logs..."
echo "Recent Prosody logs:"
run_ssh "tail -20 /var/log/prosody/prosody.log | grep -i 'teacher\|grant'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Teacher Role Module Installed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 How It Works:"
echo "   • Teachers join with displayName: '[TEACHER] Name'"
echo "   • Module detects [TEACHER] prefix"
echo "   • Grants owner + moderator role automatically"
echo "   • Students without prefix get normal role"
echo ""
echo "⚠️  IMPORTANT: Update your client code to prefix teacher names!"
echo "   In middleware.ts, when teacher joins, set:"
echo "   displayName: '[TEACHER] ' + actualName"
echo ""
echo "🧪 Test at https://app.rv2class.com"
echo ""
