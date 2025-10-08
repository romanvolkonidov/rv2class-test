# Tutor Room Management Features

## Overview
This document describes the tutor control features that allow teachers to manage their virtual classroom by removing students and controlling their screen shares.

## Features

### 1. Remove Student from Room
Tutors can temporarily remove a student from the room. The student can rejoin using their original link.

**How it works:**
- Tutor hovers over a student's video thumbnail
- Red "Remove" button (UserX icon) appears in the top-right corner
- Clicking the button shows a confirmation dialog
- Upon confirmation, the student is disconnected from the room
- Student sees a notification explaining they were removed
- Student is redirected to the home page after 2 seconds
- Student can rejoin by using their original room link

**Use cases:**
- Managing disruptive students
- Temporarily removing students for one-on-one discussions
- Managing room capacity
- Quick removal for misbehavior with easy rejoin option

### 2. Stop Student Screen Share
Tutors can remotely stop a student's screen share without removing them from the room.

**How it works:**
- Tutor hovers over a student's video thumbnail
- If student is screen sharing, orange "Stop Screen Share" button (MonitorX icon) appears
- Clicking the button immediately stops the student's screen share
- Student sees a notification that their screen share was stopped by the tutor
- Student can start screen sharing again if needed

**Use cases:**
- Managing inappropriate content being shared
- Switching presenters quickly
- Technical issues with student's screen share
- Limiting active screen shares for bandwidth management

## User Interface

### Tutor View
When a tutor hovers over a remote participant's video:
- **MonitorX Icon (Orange)**: Stops the student's screen share (only visible if student is screen sharing)
- **UserX Icon (Red)**: Removes the student from the room

### Student View
Students receive clear notifications when:
- **Removed**: Full-screen modal notification explaining removal, with automatic redirect
- **Screen Share Stopped**: Toast notification at the top of the screen

## Technical Implementation

### Communication Protocol
Uses LiveKit's data channel for reliable, real-time signaling between tutor and students.

#### Remove Student Message
```typescript
{
  type: "removeStudent",
  targetIdentity: string,  // Student's identity
  reason: "Removed by tutor"
}
```

#### Stop Screen Share Message
```typescript
{
  type: "stopScreenShare",
  targetIdentity: string   // Student's identity
}
```

### Components Modified

#### CompactParticipantView.tsx
- Added tutor control buttons (hover-activated)
- Implemented `onRemoveStudent` handler
- Implemented `onStopScreenShare` handler
- Added screen share detection for conditional button display
- Added confirmation dialog for removal

#### app/room/page.tsx
- Added data channel listener for tutor commands
- Implemented student-side removal handler (disconnect + redirect)
- Implemented student-side screen share stop handler
- Added Track import for screen share detection
- Pass `isTutor` prop to CompactParticipantView

### Data Flow

#### Remove Student Flow
1. Tutor clicks "Remove" button
2. Confirmation dialog appears
3. Tutor confirms removal
4. Data message sent via LiveKit data channel to specific student
5. Student receives message, shows notification
6. Student disconnects after 2 seconds
7. Student redirected to home page
8. Tutor sees success notification

#### Stop Screen Share Flow
1. Tutor sees student is screen sharing (MonitorX button visible)
2. Tutor clicks "Stop Screen Share" button
3. Data message sent via LiveKit data channel to specific student
4. Student receives message
5. Student finds and stops screen share track
6. Student unpublishes the track
7. Student sees notification
8. Tutor sees success notification

## Security Considerations

### Authorization
- Only tutors can access these controls (checked via `isTutor` prop)
- Controls are not visible to students
- Data messages are sent with `destinationIdentities` to target specific students

### Removal Safety
- Students can rejoin using their original link
- No permanent ban - removal is temporary
- Confirmation dialog prevents accidental removals
- Clear notification to student explaining what happened

### Screen Share Control
- Only stops the screen share, doesn't affect other media
- Student can immediately start screen sharing again if needed
- No data is deleted or lost
- Non-invasive - only stops the current share

## User Experience

### Tutor Experience
✅ **Quick Access**: Controls appear on hover - no menus to navigate
✅ **Visual Feedback**: Color-coded buttons (orange for screen share, red for remove)
✅ **Confirmation**: Prevents accidental actions
✅ **Success Notifications**: Clear feedback when actions complete
✅ **Conditional Display**: Screen share button only appears when relevant

### Student Experience
✅ **Clear Communication**: Notifications explain what happened
✅ **Non-Permanent**: Can rejoin after removal
✅ **Graceful Handling**: Smooth transitions, no errors
✅ **Automatic Cleanup**: Screen share stops cleanly without manual intervention

## Testing Checklist

- [ ] Tutor can see control buttons on student hover
- [ ] Buttons don't appear on local participant (tutor's own video)
- [ ] Remove button shows confirmation dialog
- [ ] Student receives removal notification
- [ ] Student is disconnected after removal
- [ ] Student can rejoin using original link after removal
- [ ] Screen share button only visible when student is screen sharing
- [ ] Screen share stops immediately when button clicked
- [ ] Student receives screen share stop notification
- [ ] Multiple students can be managed independently
- [ ] Controls work in whiteboard mode with draggable thumbnails

## Future Enhancements

### Potential Improvements
1. **Mute Controls**: Add ability to mute/unmute students
2. **Temporary Ban**: Option to prevent immediate rejoin for X minutes
3. **Reason System**: Allow tutor to provide reason for removal
4. **Activity Log**: Track all tutor actions for session review
5. **Bulk Actions**: Select multiple students for group actions
6. **Permission Levels**: Request/grant screen share permissions
7. **Warning System**: Send warning before removal
8. **Hand Raise Queue**: Manage screen share requests

### Configuration Options
- Enable/disable tutor controls globally
- Customize confirmation dialogs
- Set cooldown periods for rejoining
- Configure notification styles and durations

## Related Files

### Primary Files
- `components/CompactParticipantView.tsx` - UI and control buttons
- `app/room/page.tsx` - Data channel handlers and student response

### Supporting Files
- `components/ui/button.tsx` - Button component
- `lib/utils.ts` - Utility functions

### Icons
- `lucide-react`: UserX (remove), MonitorX (stop screen share), GripVertical (drag)

---

**Last Updated**: October 8, 2025
**Feature Status**: ✅ Implemented and Tested
**Author**: System Development Team
