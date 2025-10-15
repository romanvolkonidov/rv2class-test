# Jitsi Integration Guide

## Overview
This guide documents the integration of Jitsi Meet as an alternative video conferencing platform alongside BigBlueButton (BBB) in the RV2Class teaching platform.

## Implementation Summary

### What Was Added

#### 1. **JitsiRoom Component** (`/components/JitsiRoom.tsx`)
- Embeds Jitsi Meet using the official Jitsi Meet External API
- Uses the public `meet.jit.si` server (can be customized to self-hosted)
- Features:
  - Automatic moderator role for tutors (first participant)
  - Customized toolbar with education-focused features
  - Proper cleanup on component unmount
  - Error handling and loading states
  - Automatic handling of leave events

#### 2. **Platform Selection UI** (Updated `/app/page.tsx`)
- Teachers now see a 3-step flow:
  1. Click "Start a Lesson"
  2. Select teacher (Roman or Violet)
  3. **NEW**: Choose platform (BigBlueButton or Jitsi Meet)
- Platform choice is stored in Firebase `activeRooms` collection
- Clean, card-based UI with clear descriptions for each platform

#### 3. **Unified Room Page** (Updated `/app/room/page.tsx`)
- Single route (`/room`) now handles both BBB and Jitsi
- Platform determined by URL parameter: `?platform=bbb` or `?platform=jitsi`
- Renders appropriate component based on platform selection
- Backward compatible (defaults to BBB if no platform specified)

#### 4. **Student Integration** (Updated `/app/student/[id]/student-welcome.tsx`)
- Students automatically join the platform the teacher selected
- Platform detection from Firebase `activeRooms` collection
- Fallback to BBB if platform info unavailable
- Works for both direct joins and approval-based joins

## How It Works

### Teacher Flow
1. Teacher clicks "Start a Lesson" on home page
2. Selects their name (Roman or Violet)
3. **Chooses between BigBlueButton or Jitsi Meet**
4. Platform choice is saved to Firebase: `activeRooms/{roomName}`
5. Teacher is redirected to: `/room?room={name}&name={Teacher}&isTutor=true&platform={bbb|jitsi}`
6. Appropriate component (BBBRoom or JitsiRoom) renders

### Student Flow
1. Student clicks "Join Class" on their welcome page
2. System checks Firebase `activeRooms/{teacherName}` for platform
3. Student is redirected to: `/room?room={teacherName}&name={Student}&isTutor=false&platform={detected}`
4. Student joins using the same platform as teacher

## Key Features

### Jitsi Advantages
- ✅ **Zero setup**: Uses public Jitsi servers
- ✅ **Lightweight**: Faster initial load
- ✅ **Simple**: No server credentials needed
- ✅ **Open source**: Can self-host later if needed
- ✅ **Mobile-friendly**: Excellent mobile browser support

### BBB Advantages
- ✅ **Education-focused**: Built specifically for teaching
- ✅ **Whiteboard**: Advanced drawing tools
- ✅ **Recording**: Server-side recording capability
- ✅ **Polling**: Interactive polls and quizzes
- ✅ **Breakout rooms**: For group activities

## Configuration

### Using Public Jitsi Server
The default implementation uses `meet.jit.si`:
```typescript
const domain = "meet.jit.si";
```

### Switching to Self-Hosted Jitsi
To use your own Jitsi server:

1. Update `JitsiRoom.tsx`:
```typescript
const domain = "your-jitsi-domain.com"; // e.g., "jitsi.rv2class.com"
```

2. If using JWT tokens for authentication:
```typescript
const options = {
  jwt: "your-jwt-token-here", // Generate on your server
  // ... other options
};
```

### Room Naming Convention
- Rooms are prefixed with `RV2Class_` to avoid collisions on public servers
- Example: Teacher "Roman" creates room `RV2Class_roman`
- This keeps your rooms organized on shared Jitsi infrastructure

## Firebase Data Structure

### activeRooms Collection
```typescript
activeRooms/{roomName} = {
  teacher: "Roman",           // Teacher name
  platform: "jitsi",         // "bbb" or "jitsi"
  startedAt: Timestamp,      // When room was created
  roomName: "roman"          // Room identifier
}
```

## Customization Options

### Jitsi Interface Config
You can customize the Jitsi interface in `JitsiRoom.tsx`:

```typescript
interfaceConfigOverwrite: {
  TOOLBAR_BUTTONS: [
    "microphone",
    "camera",
    "desktop",      // Screen sharing
    "chat",
    "raisehand",
    // Add/remove as needed
  ],
  SHOW_JITSI_WATERMARK: false,  // Remove Jitsi branding
  DEFAULT_REMOTE_DISPLAY_NAME: "Student",
}
```

### Jitsi Config Overrides
```typescript
configOverwrite: {
  startWithAudioMuted: !isTutor,  // Students start muted
  startWithVideoMuted: false,
  prejoinPageEnabled: false,      // Skip prejoin screen
  // Many more options available
}
```

## Testing Checklist

### As Teacher
- [ ] Select BBB platform → Should load BBB interface
- [ ] Select Jitsi platform → Should load Jitsi interface
- [ ] Test as Roman → Room name should be "roman"
- [ ] Test as Violet → Room name should be "violet"
- [ ] Check you have moderator controls in Jitsi
- [ ] Verify camera/mic work in both platforms

### As Student
- [ ] Join when teacher uses BBB → Should connect to BBB
- [ ] Join when teacher uses Jitsi → Should connect to Jitsi
- [ ] Test on desktop browser
- [ ] Test on mobile browser (iOS Safari, Android Chrome)
- [ ] Verify automatic platform detection works
- [ ] Test fallback to BBB if platform info missing

## Troubleshooting

### Jitsi Not Loading
1. Check browser console for errors
2. Verify `https://meet.jit.si/external_api.js` is loading
3. Check if blocked by adblocker/privacy extensions
4. Try in incognito mode

### Students Joining Wrong Platform
1. Check Firebase `activeRooms` collection
2. Verify platform field is set correctly
3. Clear browser cache and reload
4. Check console logs for platform detection

### Camera/Mic Not Working in Jitsi
1. Check browser permissions (same as BBB)
2. Jitsi requires HTTPS (works on localhost for dev)
3. Try refreshing the page
4. Check if other apps are using camera/mic

## Future Enhancements

### Potential Improvements
1. **JWT Authentication**: Secure Jitsi rooms with tokens
2. **Self-Hosted Jitsi**: Deploy your own Jitsi server for more control
3. **Recording Support**: Enable Jitsi recording (requires Jibri setup)
4. **Platform Preferences**: Save teacher's preferred platform
5. **Multi-Platform**: Allow switching mid-session (advanced)
6. **Analytics**: Track platform usage and performance

### Self-Hosted Jitsi Setup (Future)
When ready to self-host:
1. Deploy Jitsi Meet on a server
2. Configure JWT authentication
3. Update domain in JitsiRoom.tsx
4. Add JWT generation endpoint
5. Configure recording (optional, requires Jibri)

## Security Considerations

### Public Jitsi Server
- ⚠️ Anyone with the room name can join
- Room names use predictable pattern (teacher names)
- No password protection by default
- Suitable for: Low-security use cases, testing

### Recommendations for Production
1. **Use self-hosted Jitsi** with JWT auth
2. **Generate random room IDs** instead of using teacher names
3. **Implement lobby/waiting room** for Jitsi (requires JWT)
4. **Add password protection** for sensitive sessions
5. **Monitor usage** and set rate limits

### Current Security Model
- Teacher is first participant → becomes moderator
- Moderator can kick participants
- Moderator can lock room
- Students can't promote themselves
- Works well with teacher present from start

## API Reference

### JitsiRoom Component Props
```typescript
interface JitsiRoomProps {
  meetingID: string;      // Room identifier
  participantName: string; // Display name
  isTutor: boolean;       // Moderator status
  studentId?: string;     // Optional student ID
  onLeave?: () => void;   // Called when user leaves
}
```

### URL Parameters for /room
```
/room?room={roomName}&name={userName}&isTutor={true|false}&platform={bbb|jitsi}&studentId={optional}
```

## Support & Resources

### Jitsi Documentation
- **Main Docs**: https://jitsi.github.io/handbook/
- **API Reference**: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe
- **Config Options**: https://github.com/jitsi/jitsi-meet/blob/master/config.js

### BigBlueButton Documentation
- **Main Docs**: https://docs.bigbluebutton.org/
- **API**: https://docs.bigbluebutton.org/dev/api.html

## Conclusion

You now have a dual-platform video conferencing system! Teachers can choose the platform that best fits their teaching style and technical requirements, while students seamlessly join whichever platform the teacher selected.

**Next Steps**:
1. Test both platforms thoroughly
2. Gather teacher feedback on preferences
3. Consider self-hosting Jitsi for production use
4. Monitor performance and user experience
5. Iterate based on usage patterns

Happy Teaching! 🎓✨
