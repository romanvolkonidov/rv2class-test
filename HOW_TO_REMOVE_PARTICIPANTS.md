# How to Remove a Participant as a Teacher

## Quick Guide for Teachers

### Step-by-Step Instructions

1. **Locate the Student's Video Thumbnail**
   - Look for the student's video in the participant thumbnails
   - These appear as small video boxes with the student's name

2. **Hover Over the Thumbnail**
   - Move your mouse cursor over the student's video thumbnail
   - On touch devices, you may need to tap once to activate hover state

3. **Click the Remove Button**
   - A **red button with an X icon** (UserX) will appear in the top-right corner of the thumbnail
   - This button is labeled "Remove from room"

4. **Confirm Removal**
   - A confirmation dialog will appear asking: "Remove [Student Name] from the room? They can rejoin using their link."
   - Click **OK** to confirm removal
   - Click **Cancel** to abort

5. **Student is Removed**
   - The student will see a notification explaining they were removed
   - They will be disconnected after 2 seconds
   - They will be redirected to the home page

### Additional Controls

**Stop Screen Share** (if student is sharing screen):
- An **orange button with a monitor icon** (MonitorX) will also appear
- Click this to stop the student's screen share without removing them
- No confirmation dialog - takes effect immediately

### Important Notes

✅ **Students can rejoin**: Removal is temporary - students can return using their original room link

✅ **Only visible to tutors**: Students cannot see these control buttons on their own view or on other students' thumbnails

✅ **Works on all views**: These controls are available both in normal video mode and during whiteboard sessions

### Troubleshooting

**Q: I don't see the remove button**
- Make sure you're logged in as a tutor
- Try hovering over the thumbnail again
- The button only appears on remote participants (not your own video)

**Q: The button doesn't work**
- Check your internet connection
- Refresh the page if needed
- Make sure you're still connected to the room

**Q: Student keeps coming back**
- This is expected behavior - students can rejoin
- If you need a permanent ban, this feature needs to be implemented separately

### Visual Reference

```
┌─────────────────────────┐
│   [Student Video]       │
│                    [🛑][❌]│ ← Hover to reveal
│                         │
│ [🔇] Student Name       │ ← Bottom: Muted indicator + Name
└─────────────────────────┘

Legend:
🛑 = Stop Screen Share (orange button, MonitorX icon)
❌ = Remove Student (red button, UserX icon)
🔇 = Microphone Muted (red indicator, bottom-left)
```

### Related Features

- **Microphone Muted Indicator**: Red icon with MicOff symbol in bottom-left corner shows when student's mic is off
- **Screen Share Detection**: Stop screen share button only appears when the student is actively sharing their screen
- **Drag Thumbnails**: You can drag and reposition thumbnails during whiteboard mode (both mouse and touch)

---

**Last Updated**: October 8, 2025
**Feature Location**: `components/CompactParticipantView.tsx`
**Related Documentation**: `TUTOR_ROOM_MANAGEMENT.md`
