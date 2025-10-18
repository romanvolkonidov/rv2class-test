# Jitsi Server Configuration: Teacher Always Moderator

## Problem
Currently, the first person to join a Jitsi meeting becomes the moderator. If a teacher disconnects and rejoins after students, they lose moderator rights.

## Solution
Configure the Jitsi server (Prosody) to automatically grant moderator rights to anyone with "teacher_" prefix in their email.

## Installation Steps

### 1. Copy the Prosody Module to Server

SSH into your Jitsi server (jitsi.rv2class.com) and create the module:

```bash
ssh root@jitsi.rv2class.com
cd /usr/share/jitsi-meet/prosody-plugins/
nano mod_always_grant_teacher_moderator.lua
```

Paste the contents from `jitsi-custom/config/prosody-mod-auth.lua`

### 2. Enable the Module

Edit Prosody configuration:

```bash
nano /etc/prosody/conf.avail/jitsi.rv2class.com.cfg.lua
```

Find the `Component "conference.jitsi.rv2class.com" "muc"` section and add the module:

```lua
Component "conference.jitsi.rv2class.com" "muc"
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        "token_verification";
        "always_grant_teacher_moderator"; -- ADD THIS LINE
    }
    -- rest of config...
```

### 3. Restart Prosody

```bash
systemctl restart prosody
systemctl status prosody
```

Check logs for confirmation:
```bash
tail -f /var/log/prosody/prosody.log | grep teacher_moderator
```

You should see: `mod_always_grant_teacher_moderator loaded`

### 4. Test the Setup

1. Join as student (email: roman@rv2class.com)
2. Join as teacher (email: teacher_Roman@rv2class.com)
3. Verify teacher has moderator controls even though they joined second
4. Test disconnect/reconnect - teacher should regain moderator

## How It Works

The Prosody module hooks into `muc-occupant-pre-join` event:
- Checks if joining user's JID node starts with "teacher_"
- Sets `occupant.role = "moderator"`
- Sets `affiliation = "owner"` for full permissions
- Runs with priority 10 (early in hook chain)

## Client-Side Code (Already Implemented)

In `components/JitsiRoom.tsx`, we differentiate teachers:

```typescript
const userInfo = {
  displayName: user?.displayName || 'Anonymous',
  email: user?.email 
    ? (isTutor 
        ? `teacher_${user.email}` 
        : user.email)
    : undefined,
};
```

This ensures:
- Teachers: `teacher_Roman@rv2class.com`
- Students: `roman@rv2class.com`

## Verification

After setup, check Prosody logs when teacher joins:
```bash
grep "Granting moderator" /var/log/prosody/prosody.log
```

Expected output:
```
Granting moderator rights to teacher: teacher_Roman@rv2class.com
```

## Fallback (If Server Config Can't Be Changed)

If you don't have server access, use client-side approach (less reliable):

```typescript
api.addEventListener('videoConferenceJoined', () => {
  if (isTutor) {
    // Try to claim moderator
    setTimeout(() => {
      api.executeCommand('toggleLobby', false);
    }, 1000);
  }
});
```

This is already partially in code but server-side is the proper solution.

## Troubleshooting

**Module not loading:**
- Check syntax: `luac -p mod_always_grant_teacher_moderator.lua`
- Verify permissions: `chmod 644 mod_always_grant_teacher_moderator.lua`

**Teacher not getting moderator:**
- Confirm email prefix: Check browser console for actual email sent
- Check Prosody logs: `journalctl -u prosody -f`
- Verify module is in modules_enabled list

**All users becoming moderators:**
- Check the regex pattern in module (should be `^teacher_`)
- Verify isTutor logic in React code

## Security Considerations

- Ensure `isTutor` flag in your app is properly authenticated
- Don't rely solely on email prefix - validate on your backend
- Consider adding JWT tokens for additional security

## Next Steps

1. Deploy this module to production server
2. Test with multiple users
3. Monitor logs for any issues
4. Consider adding lobby features for students-only meetings
