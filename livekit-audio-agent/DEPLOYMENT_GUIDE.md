# Quick Fix Deployment Guide

## ✅ **Changes Made**

### 1. Set `hidden=False` (Line ~246)
- **Why:** Allows agent to receive participant events from LiveKit properly
- **Impact:** Agent will now appear in participant list but is clearly identifiable

### 2. Added `participant_connected` Event Handler
- **Why:** Logs when new participants join the room
- **Impact:** Better visibility into agent behavior

### 3. Enhanced Logging in `track_subscribed`
- **Why:** Shows track kind and participant info when tracks are subscribed
- **Impact:** Easier debugging

## 🚀 **Deployment Steps**

### Step 1: Test Locally (Optional but Recommended)

```bash
cd /home/roman/Documents/rv2class/livekit-audio-agent

# Activate virtual environment
source venv-deepfilter/bin/activate

# Run agent locally
python deepfilter_agent.py
```

**Expected output when you join a room:**
```
✅ Connected to room: roman
📊 Found 1 existing participants
👋 New participant joined: Roman
📡 Track subscribed - Kind: KIND_AUDIO, Participant: Roman  
🎤 Subscribed to audio from: Roman
🎧 Starting DeepFilterNet processing for Roman
🎙️ Publishing DeepFiltered track: Roman_deepfiltered
```

### Step 2: Deploy to Fly.io

```bash
cd /home/roman/Documents/rv2class/livekit-audio-agent

# Deploy the fix
flyctl deploy --app rv2class-audio-agent
```

### Step 3: Monitor Deployment

```bash
# Watch logs in real-time
flyctl logs --app rv2class-audio-agent

# OR use the monitoring script
./monitor_audio.sh
```

### Step 4: Verify It's Working

#### Method A: Use the Audio Routing Checker

```bash
# While you're in a room, run:
source venv-deepfilter/bin/activate
python check_audio_routing.py roman

# Expected output:
# ✅ FULLY PROCESSED
# ✅ All 1 users have filtered audio tracks
# ✅ Users should ONLY hear noise-suppressed audio!
```

#### Method B: Check Fly.io Logs

Look for these log lines after joining a room:

```
✅ Connected to room: YOUR_ROOM
📊 Found 1 existing participants  (or more)
👋 New participant joined: YOUR_NAME
🎤 Subscribed to audio from: YOUR_NAME
🎙️ Publishing DeepFiltered track: YOUR_NAME_deepfiltered
🔊 YOUR_NAME audio level: XX.X
```

## 🎯 **Success Criteria**

After deployment, you should see:

1. **In Fly.io logs:**
   - ✅ Participant count > 0
   - ✅ "Subscribed to audio from" messages
   - ✅ "Publishing DeepFiltered track" messages
   - ✅ Periodic audio level logs

2. **In audio routing checker:**
   - ✅ "FULLY PROCESSED" status
   - ✅ Filtered audio tracks present

3. **User experience:**
   - ✅ Crystal clear audio
   - ✅ Background noise removed
   - ✅ No echo from own voice

## 🔧 **Troubleshooting**

### If agent still shows 0 participants:

1. Check that LiveKit URL in Fly.io environment matches your server
2. Verify API credentials are correct in Fly.io secrets
3. Check firewall/network issues between Fly.io and LiveKit

### If filtered tracks aren't created:

1. Check Fly.io logs for errors during processing
2. Verify DeepFilterNet model loaded successfully
3. Check memory usage (might need larger Fly.io machine)

### If users still hear background noise:

1. Verify client filter logic is active (check browser console)
2. Confirm filtered tracks exist (use routing checker)
3. Check RoomAudioRenderer is present in room page

## 📊 **Monitoring Commands**

```bash
# Quick status check
./monitor_audio.sh

# Live log monitoring
flyctl logs --app rv2class-audio-agent

# Check specific room
python check_audio_routing.py ROOM_NAME

# Check all rooms
python check_audio_routing.py
```

## 🎉 **What This Fix Does**

**Before:** Agent hidden → No events → No processing → Raw audio with noise

**After:** Agent visible → Receives events → Processes audio → Clean audio for all

The agent will now:
1. ✅ Detect when participants join
2. ✅ Subscribe to their audio tracks
3. ✅ Process audio with DeepFilterNet3
4. ✅ Publish filtered tracks
5. ✅ Users hear only processed audio (client filter logic)

---

**Ready to deploy:** `flyctl deploy --app rv2class-audio-agent`
