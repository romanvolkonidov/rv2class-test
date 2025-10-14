# BigBlueButton Setup Guide for rv2class

## 🎯 Complete Migration Steps

### Step 1: Set Up BigBlueButton Server

You have 3 options:

#### Option A: Quick Test Server (Docker - Development Only)
```bash
# On a Linux machine with Docker
git clone https://github.com/bigbluebutton/docker
cd docker
./scripts/setup

# Get your BBB URL and secret
docker-compose exec bbb bbb-conf --secret
```

#### Option B: Production Server (Recommended)
**Requirements:**
- Ubuntu 20.04 or 22.04 LTS (64-bit)
- 8GB RAM minimum (16GB recommended)
- 4 CPU cores minimum
- 500GB disk space
- Domain name with SSL certificate

**Installation:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install BBB 2.7 (latest stable)
wget -qO- https://ubuntu.bigbluebutton.org/bbb-install-2.7.sh | \
  bash -s -- -w -v focal-270 \
  -s tutoring.yourdomain.com \
  -e admin@yourdomain.com

# This will:
# - Install BigBlueButton 2.7
# - Configure Nginx with SSL (Let's Encrypt)
# - Set up Greenlight (web interface)

# Get your credentials
bbb-conf --secret
```

You'll see output like:
```
URL: https://tutoring.yourdomain.com/bigbluebutton/
Secret: abc123def456ghi789jkl...
```

#### Option C: Use a Hosted Provider
**Easiest option - no server management:**
- **Blindside Networks** (official): https://blindsidenetworks.com
- **BigBlueButton Hosting**: https://bigbluebutton.hosting
- **EduConf**: https://educonf.io

Prices: ~$0.10-0.50 per concurrent user per hour

### Step 2: Configure Your Next.js App

1. **Copy environment variables:**
```bash
cd /home/roman/Documents/rv2class
cp .env.bbb.example .env.local
```

2. **Edit `.env.local` with your BBB credentials:**
```bash
nano .env.local
```

Add:
```
BBB_URL=https://your-bbb-server.com/bigbluebutton/
BBB_SECRET=your_secret_from_bbb_conf
```

### Step 3: Install Dependencies

```bash
# Remove LiveKit packages and install updated dependencies
npm install

# Verify no LiveKit packages remain
npm list | grep livekit
# Should show nothing

# Build the project
npm run build
```

### Step 4: Test the Integration

1. **Start development server:**
```bash
npm run dev
```

2. **Test BBB API connection:**
```bash
# Create a test file to verify connection
curl http://localhost:3000/api/bbb-meeting?meetingID=test-room
```

3. **Join a test meeting:**
- Navigate to: `http://localhost:3000/bbb-room?room=test-lesson&name=TestTutor&tutor=true`
- You should be redirected to BBB interface

### Step 5: Update Your Existing Pages

You need to update any pages that currently link to `/room` to instead link to `/bbb-room`.

**Find all room links:**
```bash
grep -r "/room" app/ components/ --include="*.tsx" --include="*.ts"
```

**Common files to update:**
- Tutor dashboard links
- Student join links
- Any "Start Lesson" buttons

**Example change:**
```tsx
// OLD (LiveKit)
router.push(`/room?room=${roomName}&name=${userName}&tutor=true`);

// NEW (BBB)
router.push(`/bbb-room?room=${roomName}&name=${userName}&tutor=true`);
```

### Step 6: Database Setup

Create Firebase collection for BBB meetings:

```typescript
// This is already handled in the code, but verify it exists
// Collection: bbb_meetings
// Document ID: {meetingID}
// Fields:
// - meetingID: string
// - attendeePW: string
// - moderatorPW: string
// - createdAt: string
// - createdBy: string
```

### Step 7: Optional - Customize BBB

**Add your branding:**
```bash
# On your BBB server
sudo vim /usr/share/bbb-web/WEB-INF/classes/bigbluebutton.properties
```

Change:
```
# Default welcome message
defaultWelcomeMessage=Welcome to rv2class!
defaultWelcomeMessageFooter=Powered by BigBlueButton

# Branding
defaultLogoURL=https://yourdomain.com/logo.png
```

Restart BBB:
```bash
sudo bbb-conf --restart
```

### Step 8: Remove Old LiveKit Code (Cleanup)

**Backup first!**
```bash
git add .
git commit -m "Backup before removing LiveKit"
```

**Remove LiveKit files:**
```bash
# Remove old room page
mv app/room/page.tsx app/room/page.tsx.livekit.backup

# Remove LiveKit components
mv components/CustomVideoConference.tsx components/CustomVideoConference.tsx.backup
mv components/CustomControlBar.tsx components/CustomControlBar.tsx.backup
mv components/CompactParticipantView.tsx components/CompactParticipantView.tsx.backup

# Remove LiveKit API endpoints
rm -rf app/api/livekit-token
rm -rf app/api/test-livekit

# Remove LiveKit audio agent (if you're not using it with BBB)
# CAREFUL: Only do this if you're sure
# mv livekit-audio-agent livekit-audio-agent.backup
```

## 🧪 Testing Checklist

- [ ] Tutor can create a meeting
- [ ] Student can join meeting
- [ ] Video and audio work
- [ ] Screen sharing works
- [ ] Chat works
- [ ] Whiteboard works (BBB built-in)
- [ ] Tutor can end meeting
- [ ] Recording starts/stops
- [ ] Mobile browsers work
- [ ] Firewall allows BBB ports (16384-32768 UDP)

## 🔧 Troubleshooting

### Problem: "Server configuration error"
**Solution:** Check that `BBB_URL` and `BBB_SECRET` are set in `.env.local`

### Problem: Can't join meeting
**Solution:** 
1. Check BBB server is running: `sudo bbb-conf --check`
2. Check firewall allows ports: 80, 443, 16384-32768 UDP
3. Verify domain has valid SSL certificate

### Problem: No audio/video
**Solution:**
1. Check browser permissions (camera/microphone)
2. Verify HTTPS is working (required for WebRTC)
3. Check TURN server is configured: `sudo bbb-conf --secret`

### Problem: Poor video quality
**Solution:**
1. Increase BBB server resources
2. Configure video quality settings in BBB
3. Check network bandwidth

## 🚀 Production Deployment

### Update Vercel Environment Variables

```bash
# Add to Vercel project settings
vercel env add BBB_URL
vercel env add BBB_SECRET

# Deploy
vercel --prod
```

### Monitor BBB Server

```bash
# Check BBB status
sudo bbb-conf --check

# View logs
sudo bbb-conf --debug

# Monitor resources
htop

# Check active meetings
sudo bbb-conf --status
```

## 📊 Performance Optimization

### BBB Server Tuning

```bash
# Increase connection limits
sudo vim /etc/nginx/nginx.conf
# Set: worker_connections 4096;

# Optimize video settings
sudo vim /usr/share/bbb-web/WEB-INF/classes/bigbluebutton.properties
# Adjust: videoconf.maxUsers
```

### Database Indexes

Add Firebase indexes for better performance:
```
Collection: bbb_meetings
Index: meetingID (ascending)
```

## 🎓 Next Steps

1. **Test with real students** - Get feedback
2. **Set up recordings storage** - Configure where BBB stores recordings
3. **Add analytics** - Track meeting usage
4. **Configure auto-cleanup** - Delete old meeting records
5. **Set up monitoring** - Alert if BBB server goes down

## 🆘 Need Help?

- BBB Documentation: https://docs.bigbluebutton.org
- BBB Community: https://bigbluebutton.org/support
- BBB Docker: https://github.com/bigbluebutton/docker

## 🎉 You're Done!

Your rv2class platform now runs on BigBlueButton - a more stable, feature-rich solution!

**Key differences users will notice:**
- Different UI (more professional, classroom-focused)
- Built-in whiteboard (replace or keep Excalidraw)
- Easier recording access
- More stable connections
- Polling/quiz features
- Better mobile experience

**To switch back to LiveKit** (if needed):
Just restore the backup files and reinstall LiveKit packages.
