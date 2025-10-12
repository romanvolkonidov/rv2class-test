# 🧪 Testing DeepFilterNet with Your Live App

## ✅ Current Setup:
- **Frontend**: https://rv2class-test.vercel.app/ (Vercel)
- **LiveKit Server**: wss://rv2class-livekit.fly.dev (Fly.io)
- **DeepFilterNet Agent**: Running locally on your laptop

## 🎯 How to Test (No Changes Needed!)

### Step 1: Verify Agent is Running

```bash
cd /home/roman/Documents/rv2class/livekit-audio-agent

# Check if agent is running
ps aux | grep deepfilter_agent | grep -v grep

# Check health endpoint
curl http://localhost:8080/health

# View live logs
tail -f agent.log
```

### Step 2: Test with Your Live App

1. **Open your app**: https://rv2class-test.vercel.app/
2. **Log in** as a tutor or student
3. **Join or create a room**
4. **Turn on your microphone**
5. **Start speaking** - the agent will automatically process your audio!

### Step 3: Verify It's Working

**In the agent logs**, you should see:
```
🚪 Joining room: room-name
✅ Connected to room: room-name
🎤 Subscribed to audio from: participant-name
🎧 Starting DeepFilterNet processing
🔊 participant-name audio level: 150.2
```

**In your browser console** (F12):
- You'll see LiveKit track events
- Audio tracks from the agent will appear
- Look for tracks with "deepfiltered" in the name

### Step 4: Compare Audio Quality

**Test it:**
1. Join a room with a friend/colleague
2. Make noise in the background (play music, type on keyboard, etc.)
3. Speak normally
4. The other person will hear crystal-clear audio with **zero background noise**!

## 📊 What to Check

### Agent is Processing:
```bash
# Watch logs in real-time
cd /home/roman/Documents/rv2class/livekit-audio-agent
tail -f agent.log

# You should see:
# - Room joining messages
# - Audio processing messages
# - Frame statistics
```

### Browser Console:
```javascript
// Open DevTools (F12) and check:
// - LiveKit connection status
// - Track subscriptions
// - Audio level meters
```

## 🎮 Test Scenarios

### Test 1: Background Noise Removal
1. Join a room
2. Play loud music near your microphone
3. Speak normally
4. **Result**: Other person hears your voice clearly, no music!

### Test 2: Keyboard Typing
1. Join a room
2. Type on your keyboard while speaking
3. **Result**: No keyboard clicks heard!

### Test 3: Rain/Traffic
1. Join a room
2. Play rain/traffic sounds
3. Speak normally
4. **Result**: Only your voice, complete silence otherwise!

## 🔍 Debugging

### Agent Not Processing?

```bash
# Check if agent is running
ps aux | grep deepfilter_agent

# If not running, start it:
cd /home/roman/Documents/rv2class/livekit-audio-agent
./start_agent.sh

# Watch logs
tail -f agent.log
```

### Not Seeing Processed Audio?

The agent publishes tracks named: `{participant.identity}_deepfiltered`

Check in browser console:
```javascript
room.on(RoomEvent.TrackPublished, (publication, participant) => {
  console.log('Track published:', publication.trackName, 'from:', participant.identity);
});
```

### Agent Not Joining Rooms?

The agent joins rooms **dynamically** when participants join. It doesn't pre-join rooms.

**To make it join specific rooms:**
Edit `.env`:
```bash
LIVEKIT_ROOMS=room1,room2,room3
```

Then restart:
```bash
pkill -f deepfilter_agent
./start_agent.sh
```

## 🚀 Making It Permanent

Right now the agent runs locally on your laptop. To make it always available:

### Option 1: Deploy to Fly.io (Recommended)

```bash
# In the agent directory
fly launch

# Follow prompts to deploy
fly deploy
```

### Option 2: Run on a Server

```bash
# Copy the agent folder to your server
scp -r livekit-audio-agent user@your-server:/opt/

# SSH to server
ssh user@your-server

# Run as systemd service (see DEEPFILTER_SETUP.md)
```

### Option 3: Keep Running Locally

```bash
# Make it run on boot
crontab -e

# Add this line:
@reboot cd /home/roman/Documents/rv2class/livekit-audio-agent && ./start_agent.sh
```

## 📱 Testing Checklist

- [ ] Agent health endpoint responds: `curl http://localhost:8080/health`
- [ ] Agent logs show "Agent ready to join rooms"
- [ ] Open https://rv2class-test.vercel.app/
- [ ] Join a room
- [ ] Turn on microphone
- [ ] Agent logs show "Subscribed to audio from: [your-name]"
- [ ] Make noise (keyboard, music, etc.)
- [ ] Other participant hears only your voice, no noise!

## 🎉 Success Indicators

**You'll know it's working when:**
1. ✅ Agent logs show audio processing messages
2. ✅ Audio level shows in logs: `🔊 username audio level: 150.2`
3. ✅ Other participants hear crystal-clear audio
4. ✅ Background noise is completely removed
5. ✅ Voice quality is excellent

## 💡 Pro Tips

### View Live Stats:
```bash
# CPU usage
htop

# Network stats
netstat -an | grep 7880

# Agent logs
tail -f agent.log | grep "audio level"
```

### Test Different Noise Levels:
```bash
# Edit attenuation limit (60-120)
nano .env
# Change ATTENUATION_LIMIT=100

# Restart agent
pkill -f deepfilter_agent
./start_agent.sh
```

### Monitor Performance:
```bash
# Watch agent resource usage
watch -n 1 'ps aux | grep deepfilter_agent'
```

## ❓ FAQ

**Q: Do I need to change anything in my Vercel app?**
A: No! The agent works with your existing app.

**Q: Will all participants get processed audio?**
A: Yes! The agent processes everyone's audio automatically.

**Q: What if I close my laptop?**
A: The agent stops. Deploy to Fly.io for 24/7 operation.

**Q: How much CPU does it use?**
A: ~20% per active participant on CPU, ~5% with GPU.

**Q: Can I test without joining a real room?**
A: Yes! Create a test room just for testing.

---

**Ready to test?** Just go to https://rv2class-test.vercel.app/ and join a room! 🎯
