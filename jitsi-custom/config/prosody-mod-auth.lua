-- Prosody Module: Always Grant Teachers Moderator Rights
-- Place this in: /usr/share/jitsi-meet/prosody-plugins/mod_always_grant_teacher_moderator.lua

local jid = require "util.jid";
local is_admin = require "core.usermanager".is_admin;

module:hook("muc-occupant-pre-join", function (event)
    local room, occupant = event.room, event.occupant;
    local user_jid = occupant.bare_jid;
    
    -- Check if the user's email contains "teacher_" prefix
    -- This matches our pattern: teacher_Roman@rv2class.com
    local node = jid.node(user_jid);
    
    if node and node:match("^teacher_") then
        module:log("info", "Granting moderator rights to teacher: %s", user_jid);
        
        -- Force this user to be a moderator
        occupant.role = "moderator";
        
        -- Set affiliation to owner for full permissions
        room:set_affiliation(true, user_jid, "owner");
    end
end, 10); -- Priority 10 to run early

module:log("info", "mod_always_grant_teacher_moderator loaded");
