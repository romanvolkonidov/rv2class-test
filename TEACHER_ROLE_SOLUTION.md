# Teacher Role Solution: How to Grant Privileges

## Current Problem
- Prosody uses `authentication = "jitsi-anonymous"` (no usernames/passwords)
- Everyone connects as anonymous, so Prosody can't tell teachers from students
- `muc_room_default_members_only = true` blocks EVERYONE (including teachers)

## Solution Options

### Option 1: JWT Tokens (Recommended for Production) 🏆
**How it works:**
1. When teacher authenticates with Firebase, generate a JWT token
2. Pass JWT in URL: `https://app.rv2class.com/room?jwt=eyJ...`
3. JWT contains: `{ "context": { "user": { "affiliation": "owner" } } }`
4. Prosody validates JWT and grants moderator role automatically

**Pros:** Secure, scalable, production-ready
**Cons:** Requires JWT generation server-side

**Implementation:**
```javascript
// In your Firebase backend
const jwt = require('jsonwebtoken');

function generateTeacherToken(teacherEmail, roomName) {
    return jwt.sign({
        context: {
            user: {
                affiliation: "owner",  // Makes them moderator
                email: teacherEmail
            }
        },
        room: roomName
    }, JWT_SECRET, { 
        algorithm: 'HS256',
        expiresIn: '2h' 
    });
}
```

### Option 2: Custom Prosody Module (Quick Fix) ⚡
**How it works:**
1. Create Prosody module that reads `userType` from connection params
2. If `userType=teacher`, grant owner affiliation
3. If `userType=student`, leave as normal participant

**Pros:** Works immediately, no JWT needed
**Cons:** Less secure (client can fake userType)

**Implementation:**
```lua
-- /usr/share/jitsi-meet/prosody-plugins/mod_grant_teacher_role.lua
module:hook("muc-occupant-pre-join", function(event)
    local origin = event.origin;
    local room = event.room;
    local stanza = event.stanza;
    
    -- Get userType from connection
    local session = origin.jitsi_session;
    if session and session.jitsi_meet_context_user then
        local userType = session.jitsi_meet_context_user.userType;
        
        if userType == "teacher" then
            -- Grant owner role to teacher
            module:log("info", "Granting owner to teacher");
            room:set_affiliation(true, event.occupant.bare_jid, "owner");
        end
    end
end, 10);
```

### Option 3: Client-Side Lobby Enable (Simplest) 🎯
**How it works:**
1. Remove `muc_room_default_members_only = true`
2. Teacher joins as first person → becomes moderator (default Jitsi)
3. Teacher's middleware calls `conference.enableLobby()` after joining
4. Students joining after see lobby

**Pros:** No server changes, works now
**Cons:** If student joins first, they become moderator (race condition)

**Implementation:** (Already in your code!)
```typescript
case CONFERENCE_JOINED:
    if (isTeacher) {
        // Teacher joined, enable lobby for students
        const { conference } = state['features/base/conference'];
        if (conference && !conference.isMembersOnly()) {
            conference.enableLobby();  // Turn on lobby
        }
    }
```

## Recommended Immediate Fix

**Use Option 3 with a safety check:**

1. **Remove blocking setting:**
   ```bash
   # Delete this line from Prosody config
   muc_room_default_members_only = true
   ```

2. **Update middleware to enable lobby when teacher joins:**
   ```typescript
   case CONFERENCE_JOINED:
       const isTeacher = isUserTeacher(store);
       if (isTeacher) {
           // Enable lobby for students
           const { conference } = state['features/base/conference'];
           conference?.enableLobby?.();
       } else {
           // Student shouldn't reach here (should be in lobby)
           // If they do, they were first - kick them out
           conference?.leave?.();
       }
   ```

3. **Student middleware redirects to lobby:**
   ```typescript
   case CONFERENCE_WILL_JOIN:
       if (!isTeacher) {
           // Show lobby screen, don't join main conference
           store.dispatch(openLobbyScreen());
           return; // Block the join
       }
   ```

## What Grants the Moderator Role?

In Jitsi + Prosody:
- **First participant** becomes moderator (if `enable-auto-owner = true`)
- **User with JWT token** `affiliation: owner` becomes moderator
- **User granted by existing moderator** becomes moderator
- **Custom Prosody module** can grant moderator based on any criteria

## Current State
- ✅ Jicofo: `enable-auto-owner = false` 
- ✅ Prosody: `muc_lobby_rooms` enabled
- ❌ No JWT tokens yet
- ❌ `muc_room_default_members_only = true` blocking everyone
- ✅ Client middleware detects teachers vs students

## Next Step
**Remove the blocking setting, then choose Option 1, 2, or 3 above!**
