# 🔊 Audio Troubleshooting Guide

## Issue: People Can't Hear Each Other

This guide will help diagnose and fix audio issues in your LiveKit room.

## Quick Diagnostics

### 1. **Use the Audio Diagnostics Panel**
Press **Ctrl+Shift+A** in the room to show real-time audio status for all participants.

Or click the "🔊 Audio Debug" button in bottom-right corner.

The panel shows:
- ✅ Who has audio published
- 🔇 Who is muted
- 🎤 Who is currently speaking
- 📊 Track IDs and status

### 2. **Check Browser Console**
Open DevTools (F12) and look for these messages:

**Good Signs:**
```
✅ Participant connected: Teacher
🎵 Track subscribed: { participant: "Teacher", kind: "audio" }
🔊 AUDIO TRACK RECEIVED from: Teacher
```

**Bad Signs:**
```
❌ Track subscription failed
🔇 Track unsubscribed
⚠️ No audio tracks found
```

### 3. **Check Visual Notifications**
You should see green notifications when audio connects:
```
🔊 Audio connected: Teacher
```

## Common Causes & Fixes

### Problem 1: Microphone Permission Not Granted

**Symptoms:**
- Audio Diagnostics shows "Audio Published: ✗ No"
- Console shows: "Permission denied"

**Fix:**
1. Click the 🔒 lock icon in browser address bar
2. Set Microphone to "Allow"
3. Refresh page (F5)
4. Allow permission when prompted

### Problem 2: Microphone Muted in UI

**Symptoms:**
- Audio Diagnostics shows "Muted: Yes"
- Microphone icon has red slash

**Fix:**
1. Click the microphone button in control bar
2. Should turn blue (unmuted)
3. Other participants should now hear you

### Problem 3: Browser Audio Blocked

**Symptoms:**
- No audio even when unmuted
- Console shows: "Audio playback blocked"

**Fix:**
1. Look for "🔇" icon in browser tab
2. Click it and allow audio
3. Or: Click anywhere in the page (activates audio context)
4. Refresh if needed

### Problem 4: Wrong Audio Device Selected

**Symptoms:**
- Audio Diagnostics shows track published but no sound
- Speaking indicator doesn't light up

**Fix (Chrome/Edge):**
1. Right-click video/audio area
2. Select "Inspect"
3. Check DevTools Console for audio device
4. Go to chrome://settings/content/microphone
5. Select correct device
6. Refresh page

### Problem 5: System Audio Muted

**Symptoms:**
- Everything looks good in diagnostics
- But no sound output

**Fix:**
1. Check system volume (Windows: Volume mixer, Mac: System Preferences)
2. Check browser isn't muted in system mixer
3. Try different audio output device
4. Test with YouTube to confirm speakers work

### Problem 6: Network/Firewall Issues

**Symptoms:**
- Tracks publish but don't subscribe
- Console shows connection errors
- Intermittent audio dropouts

**Fix:**
1. Check network speed (need 2+ Mbps)
2. Try different network
3. Disable VPN if active
4. Check firewall isn't blocking WebRTC
5. Try a different browser

## Step-by-Step Diagnostic Process

### For Teacher:
1. **Join room**
2. **Press Ctrl+Shift+A** to open diagnostics
3. **Check your own status:**
   - Audio Published: Should be ✓ Yes
   - Muted: Should be "No" (green)
   - Speaking: Should show 🎤 YES when you talk
4. **Unmute if needed** (click microphone button)
5. **Wait for students to join**
6. **Check students' status** in diagnostics panel

### For Students:
1. **Allow microphone/camera** on welcome page
2. **Join room**
3. **Press Ctrl+Shift+A** to check audio
4. **Look for teacher's audio:**
   - Teacher should show "Audio Published: ✓ Yes"
   - Muted should be "No"
5. **If you can't hear:**
   - Check your system volume
   - Click anywhere on page to activate audio
   - Check browser audio isn't blocked
   - Refresh page

## Console Commands for Testing

Open browser console (F12) and try:

### Check if audio elements exist:
```javascript
document.querySelectorAll('audio').length
```
Should return > 0 if participants have audio

### Check RoomAudioRenderer:
```javascript
console.log('Audio elements:', 
  Array.from(document.querySelectorAll('audio')).map(a => ({
    src: a.srcObject ? 'Stream attached' : 'No stream',
    muted: a.muted,
    volume: a.volume
  }))
);
```

### Force audio context resume (if blocked):
```javascript
const audioContext = new AudioContext();
audioContext.resume().then(() => console.log('Audio context resumed'));
```

## Configuration Check

### Current Audio Settings:
```typescript
LiveKitRoom options:
  audio: true                      ✓ Enabled for all
  autoSubscribe: true              ✓ Auto-receive tracks
  
audioCaptureDefaults:
  echoCancellation: true           ✓ Prevents echo
  noiseSuppression: true           ✓ Reduces background noise
  autoGainControl: true            ✓ Normalizes volume
```

## Known Working Configuration

This is what SHOULD be happening:

1. **Join Room:**
   - Browser requests mic/camera permission
   - User allows
   - LocalParticipant publishes audio track

2. **Remote Joins:**
   - Room detects new participant
   - Auto-subscribes to their audio track
   - RoomAudioRenderer creates audio element
   - Audio plays automatically

3. **Console Output:**
   ```
   ✅ Participant connected: Teacher
   🎵 Track subscribed: { kind: "audio", participant: "Teacher" }
   🔊 AUDIO TRACK RECEIVED from: Teacher
   ```

4. **You Hear Audio!** 🎉

## Still Not Working?

### Nuclear Options:

1. **Clear Browser Cache:**
   - Ctrl+Shift+Delete
   - Clear cookies, cache, site data
   - Refresh

2. **Try Different Browser:**
   - Chrome (best support)
   - Edge (Chromium-based, good)
   - Firefox (good)
   - Safari (limited support)

3. **Check LiveKit Server:**
   - Ensure NEXT_PUBLIC_LIVEKIT_URL is correct
   - Check server is running
   - Verify API key is valid

4. **Restart Everything:**
   - Close all browser tabs
   - Restart browser
   - Reconnect to room

## Get Help

If still having issues, provide:
1. Screenshot of Audio Diagnostics panel (Ctrl+Shift+A)
2. Browser console logs
3. Which browsers tested
4. Who can't hear whom (teacher→student, student→student, etc.)

## Audio Architecture

```
┌─────────────────────────────────────────────┐
│          LiveKitRoom Component               │
│                                              │
│  audio={true}  ← Everyone gets audio        │
│  autoSubscribe={true}  ← Auto-receive       │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │   RoomAudioRenderer                 │    │
│  │   (Handles ALL audio playback)      │    │
│  │                                      │    │
│  │   • Detects remote audio tracks     │    │
│  │   • Creates <audio> elements        │    │
│  │   • Attaches streams                │    │
│  │   • Manages volume                  │    │
│  └────────────────────────────────────┘    │
│                                              │
│  CustomVideoConference                      │
│  (Handles VIDEO only, no audio)             │
└─────────────────────────────────────────────┘
```

**Key Point:** RoomAudioRenderer does ALL the audio work automatically. We don't manually create audio elements.

## Success Indicators

✅ Audio working when you see:
- Green "🔊 Audio connected" notifications
- Speaking indicator lights up when person talks
- Audio Diagnostics shows "Audio Published: ✓ Yes" and "Muted: No"
- Console logs show "🎵 Track subscribed" for audio
- You actually hear the person! 🎧

## Testing Checklist

- [ ] Both participants have microphone permission
- [ ] Both participants clicked "unmute" in control bar
- [ ] Audio Diagnostics shows audio published for both
- [ ] Console shows "Track subscribed" messages
- [ ] System volume is up
- [ ] Browser audio not blocked
- [ ] Network connection is stable
- [ ] No firewall/VPN blocking WebRTC
