# Audio Agent Issue - Diagnosis & Fix

## 🚨 **Current Problem**

**Symptom:** Users in the room don't get their audio processed by DeepFilter agent.

**Evidence:**
- ✅ Client connects successfully to room
- ✅ Client publishes audio track
- ✅ Agent is running on Fly.io
- ✅ Agent joins the rooms
- ❌ **Agent reports 0 participants in the room**
- ❌ Agent never subscribes to user audio
- ❌ No filtered tracks are published

## 🔍 **Root Cause Analysis**

### Issue #1: Agent Uses `hidden=True`

```python
# Line 246 in deepfilter_agent.py
token.with_grants(api.VideoGrants(
    room_join=True,
    room=room_name,
    can_publish=True,
    can_subscribe=True,
    hidden=True  # <-- THIS IS THE PROBLEM!
))
```

**Problem:** When `hidden=True`, the agent might not receive proper participant events or track publications from LiveKit.

### Issue #2: Participant Detection Timing

The agent has two modes of detecting participants:

1. **On room join** - checks existing participants via `room.remote_participants`
2. **Via events** - listens for `track_subscribed` events

**Problem:** If LiveKit doesn't fire the events properly when `hidden=True`, the agent misses participants.

### Issue #3: Polling Shows 0 Participants

```
📊 Room roman: 0 participants, 0 being processed
```

This indicates `room.remote_participants.values()` returns empty, meaning:
- Either LiveKit isn't sending participant info to hidden agents
- Or there's a race condition

## ✅ **The Fix**

### Solution 1: Remove `hidden=True` (RECOMMENDED)

The agent SHOULD be visible as a participant. This ensures it receives all events properly.

### Solution 2: Add Better Logging

Add diagnostic logs to understand what's happening when the agent joins.

### Solution 3: Use participant_joined Events

Ensure the agent listens for `participant_joined` events to catch latecomers.

## 🔧 **Implementation**

Let me update the agent code:

### Change 1: Remove hidden=True

```python
# OLD (Line 246):
token.with_grants(api.VideoGrants(
    room_join=True,
    room=room_name,
    can_publish=True,
    can_subscribe=True,
    hidden=True  # Remove this!
))

# NEW:
token.with_grants(api.VideoGrants(
    room_join=True,
    room=room_name,
    can_publish=True,
    can_subscribe=True,
    hidden=False  # Agent is visible but identifiable
))
```

### Change 2: Add participant_joined Event Handler

```python
@room.on("participant_connected")
def on_participant_connected(participant: rtc.RemoteParticipant):
    logger.info(f"👋 New participant connected: {participant.identity}")
    # We'll handle their tracks when they're published
```

### Change 3: Better Logging

Add logs to understand when participants join and when tracks are published.

## 📊 **Expected Behavior After Fix**

### On Room Join:
```
✅ Connected to room: roman
📊 Found 1 existing participants
🎤 Subscribed to audio from: Roman
🎧 Starting DeepFilterNet processing for Roman
🎙️ Publishing DeepFiltered track: Roman_deepfiltered
🎤 First frame from Roman: 480 samples, 48000Hz
🔊 Roman audio level: 85.3
```

### Client Filter Logic:
```javascript
// Client will see:
// - Original track: "Roman" (microphone)
// - Filtered track: "Roman_deepfiltered" (from agent)

// Client filter logic will:
// 1. Detect filtered version exists
// 2. Skip original track
// 3. Only play "Roman_deepfiltered"
```

## 🎯 **Why This Will Work**

1. **Agent becomes visible** → LiveKit sends proper participant/track events
2. **Agent subscribes to audio** → Receives audio frames
3. **Agent processes & publishes** → `_deepfiltered` tracks available
4. **Client filter logic** → Only plays filtered tracks
5. **Result** → Everyone hears clean, noise-suppressed audio

## 🧪 **How to Test**

### Before Deploying:

```bash
# Test locally first
cd livekit-audio-agent
source venv-deepfilter/bin/activate
python deepfilter_agent.py
```

Watch for these logs when you join a room:
- ✅ `👋 New participant connected: YOUR_NAME`
- ✅ `🎤 Subscribed to audio from: YOUR_NAME`
- ✅ `🎙️ Publishing DeepFiltered track: YOUR_NAME_deepfiltered`

### After Deploying to Fly.io:

```bash
# Deploy the fix
flyctl deploy

# Watch logs in real-time
flyctl logs --app rv2class-audio-agent

# Or use the monitoring script
cd livekit-audio-agent
./monitor_audio.sh
```

### Verify with the checker:

```bash
python check_audio_routing.py roman

# Expected output:
# ✅ FULLY PROCESSED
# ✅ All 1 users have filtered audio tracks
# ✅ Users should ONLY hear noise-suppressed audio!
```

## 🔄 **Alternative: If hidden=True is Required**

If you need the agent to be hidden from the UI, we need to:

1. **Explicitly subscribe to all audio tracks** when detecting participants
2. **Poll more frequently** for new participants (every 2-3 seconds)
3. **Add explicit participant_joined handler** to catch latecomers
4. **Force subscription** even if publication.subscribed is false

But this is more complex and error-prone. **Recommendation: Keep agent visible.**

## 📝 **Summary**

**Problem:** `hidden=True` prevents agent from receiving participant events properly

**Solution:** Set `hidden=False` so agent receives proper LiveKit events

**Result:** Agent will detect participants, subscribe to audio, process it, and publish filtered tracks

**Next Steps:** 
1. Apply the fix (see next file: APPLY_FIX.md)
2. Test locally
3. Deploy to Fly.io
4. Verify with monitoring tools

---

**Status:** Issue identified, fix ready to apply
**Estimated Fix Time:** 5 minutes
**Impact:** HIGH - Enables noise suppression for all users
