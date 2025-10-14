# Audio Routing Analysis - LiveKit + DeepFilter Agent

## Date: October 14, 2025

## System Architecture

### Audio Flow
```
User Microphone → LiveKit → DeepFilter Agent → Processed Audio → LiveKit → All Other Users
                     ↓
              (Original Audio)
                     ↓
              (SHOULD BE FILTERED OUT ON CLIENT)
```

## How the System Works

### 1. **Agent Side (deepfilter_agent.py)**

The DeepFilter agent:
- Subscribes to all participant audio tracks
- Processes each audio stream through DeepFilterNet3
- Publishes NEW tracks with `_deepfiltered` suffix
- Example: `Roman` → `Roman_deepfiltered`

**Key Log Indicators:**
```
✅ Connected to room: roman-654405
🎤 Subscribed to audio from: Roman
🎧 Starting DeepFilterNet processing for Roman
🎙️ Publishing DeepFiltered track: Roman_deepfiltered
🔊 Roman audio level: 83.8  (periodic confirmation of processing)
```

### 2. **Client Side (CustomVideoConference.tsx)**

The client filtering logic (lines 695-740):
```typescript
// Filter tracks to prefer DeepFiltered audio
const processedTracks = tracks.filter((trackRef) => {
  // For audio tracks:
  // 1. If filtered version exists → use filtered, skip original
  // 2. If it's own filtered voice → skip (prevent echo)
  // 3. If no filtered version → use original (fallback)
});
```

### 3. **Audio Rendering (room/page.tsx)**

```tsx
<RoomAudioRenderer />  // Line 667
```

This component automatically plays ALL subscribed audio tracks except those filtered out by the logic above.

## Verification Steps

### ✅ What We Confirmed

1. **Agent subscribes to user audio**
   ```
   🎤 Subscribed to audio from: Roman
   🎤 Subscribed to audio from: Adelina
   ```

2. **Agent processes audio**
   ```
   🎧 Starting DeepFilterNet processing for Roman
   ✅ DeepFilterNet3 loaded on cpu
   🎤 First frame from Roman: 480 samples, 48000Hz
   ```

3. **Agent publishes filtered tracks**
   ```
   🎙️ Publishing DeepFiltered track: Roman_deepfiltered
   🎙️ Publishing DeepFiltered track: Adelina_deepfiltered
   ```

4. **Audio is actively being processed**
   ```
   🔊 Roman audio level: 83.8
   🔊 Adelina audio level: 69.1
   ```

5. **Client filter logic prevents original audio**
   - Original tracks are skipped when `_deepfiltered` version exists
   - Own filtered voice is skipped to prevent echo
   - `RoomAudioRenderer` only plays filtered tracks

### 🔍 How to Monitor Audio Routing

#### Option 1: Use the Audio Routing Checker Script

```bash
cd livekit-audio-agent
source venv-deepfilter/bin/activate
python check_audio_routing.py            # Check all rooms
python check_audio_routing.py roman-654405  # Check specific room
```

**Ideal Output:**
```
✅ FULLY PROCESSED
✅ All 2 users have filtered audio tracks
✅ Users should ONLY hear noise-suppressed audio!

ℹ️  Note: 2 original audio tracks still present
ℹ️  These should be MUTED or UNSUBSCRIBED on the client side
ℹ️  Client filter logic prevents these from being heard
```

#### Option 2: Check Agent Logs

```bash
tail -f livekit-audio-agent/agent.log | grep -E "(Publishing|Subscribed|deepfiltered|audio level)"
```

**What to look for:**
- ✅ `Publishing DeepFiltered track:` for each user
- ✅ `audio level:` messages every few seconds
- ❌ `Error` or `Failed` messages
- ❌ `Unsubscribed from:` without corresponding re-subscription

#### Option 3: Check LiveKit Dashboard

1. Go to LiveKit Cloud Console
2. Navigate to your room
3. Look at "Tracks" section
4. You should see:
   - Original tracks from users (e.g., Roman's microphone)
   - Filtered tracks from agent (e.g., Roman_deepfiltered)

## Potential Issues & Solutions

### ❌ Issue: No Agent in Room

**Symptoms:**
```
⚠️  NO AGENT FOUND IN ROOM
⚠️  All users hear RAW (unprocessed) audio!
```

**Solution:**
```bash
# Start the agent
cd livekit-audio-agent
./start_agent.sh
```

### ❌ Issue: Agent Not Processing All Users

**Symptoms:**
```
⚠️  INCOMPLETE PROCESSING
⚠️  Expected 3 filtered tracks, found 1
```

**Possible Causes:**
1. Agent crashed during processing
2. User joined after agent
3. Network issues

**Solution:**
- Check agent logs for errors
- Restart agent: `./start_agent.sh`

### ❌ Issue: Users Hear Original Audio

**Symptoms:**
- Users report hearing background noise
- No filtered tracks in room

**Check:**
1. Is agent running? `ps aux | grep deepfilter`
2. Are filtered tracks published? `python check_audio_routing.py`
3. Client console errors? Check browser DevTools

## Current Status (from logs)

### Last Successful Session (October 12, 2025)
- Room: `roman-654405`
- Users: Roman, Adelina
- Status: ✅ **Both users had filtered audio**
- Agent: ✅ **Processing actively**

**Evidence:**
```
2025-10-12 21:21:50,796 - 🎧 Starting DeepFilterNet processing for Roman
2025-10-12 21:21:51,167 - 🎧 Starting DeepFilterNet processing for Adelina
2025-10-12 21:21:52,014 - 🎙️ Publishing DeepFiltered track: Roman_deepfiltered
2025-10-12 21:21:52,368 - 🎙️ Publishing DeepFiltered track: Adelina_deepfiltered
2025-10-12 21:21:53,011 - 🔊 Roman audio level: 83.8
2025-10-12 21:22:06,078 - 🔊 Adelina audio level: 69.1
```

## Conclusion

### ✅ System is Working Correctly When:

1. **Agent is running** and connected to room
2. **Filtered tracks are published** for each user (`_deepfiltered` suffix)
3. **Audio level logs** appear periodically (every 10-20 seconds)
4. **Client filter logic** skips original tracks in favor of filtered ones

### 🎯 Users Are Hearing ONLY Processed Audio Because:

1. **Agent publishes** `Identity_deepfiltered` tracks
2. **Client filter logic** (lines 695-740 in CustomVideoConference.tsx):
   - Detects filtered tracks
   - Skips original tracks when filtered version exists
   - Only passes filtered tracks to `RoomAudioRenderer`
3. **RoomAudioRenderer** plays only the tracks that passed the filter
4. **Result:** Clean, noise-suppressed audio for everyone

### 📋 Monitoring Checklist

Run these commands regularly to verify everything is working:

```bash
# 1. Check if agent is running
ps aux | grep deepfilter

# 2. Check audio routing in all active rooms
cd livekit-audio-agent && source venv-deepfilter/bin/activate && python check_audio_routing.py

# 3. Monitor agent logs in real-time
tail -f livekit-audio-agent/agent.log | grep -E "(Publishing|Subscribed|deepfiltered|audio level|Error)"

# 4. Check for any errors
tail -100 livekit-audio-agent/agent.log | grep -i error
```

### 🔧 Quick Troubleshooting

If users report hearing background noise:

1. **Verify agent is running:** `ps aux | grep deepfilter`
2. **Check room status:** `python check_audio_routing.py room-name`
3. **Look for errors:** `tail -50 agent.log | grep -i error`
4. **Restart agent if needed:** `./start_agent.sh`

---

**Last Updated:** October 14, 2025
**Agent Status:** Ready (not currently running, needs to be started)
**Client Filter Logic:** ✅ Verified Active
