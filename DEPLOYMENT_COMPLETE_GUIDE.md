# Complete BigBlueButton + Fly.io Deployment Guide

## 🚀 Complete Deployment in 3 Steps

### Step 1: Get BBB Server (Choose One Option)

#### Option A: Quick Hosted BBB (Easiest - 10 minutes)
**Recommended for immediate deployment**

1. **Sign up for hosted BBB:**
   - Blindside Networks: https://blindsidenetworks.com
   - Or BigBlueButton.hosting: https://bigbluebutton.hosting
   - Or EduConf: https://educonf.io

2. **Get your credentials:**
   - They'll give you: `BBB_URL` and `BBB_SECRET`
   - Example: 
     - BBB_URL: `https://yourcompany.bbb.provider.com/bigbluebutton/`
     - BBB_SECRET: `abc123def456...`

3. **Cost:** ~$100-300/month depending on usage
4. **Skip to Step 2!**

---

#### Option B: Self-Host on DigitalOcean (30 minutes)
**Best value - $40/month**

1. **Create DigitalOcean account:** https://digitalocean.com

2. **Create Droplet:**
   ```
   - Distribution: Ubuntu 20.04 LTS
   - Plan: $40/month (8GB RAM, 4 vCPU)
   - Datacenter: Choose closest to your users
   - Add SSH key (optional but recommended)
   ```

3. **Point domain to droplet:**
   ```
   - Create A record: bbb.yourdomain.com → droplet IP
   - Wait 5-10 minutes for DNS propagation
   ```

4. **SSH into droplet:**
   ```bash
   ssh root@your-droplet-ip
   ```

5. **Install BBB (one command):**
   ```bash
   wget -qO- https://ubuntu.bigbluebutton.org/bbb-install-2.7.sh | \
     bash -s -- -w -v focal-270 \
     -s bbb.yourdomain.com \
     -e your@email.com
   ```
   
   This takes 15-20 minutes. Go get coffee! ☕

6. **Get your credentials:**
   ```bash
   bbb-conf --secret
   ```
   
   Output will show:
   ```
   URL: https://bbb.yourdomain.com/bigbluebutton/
   Secret: your_secret_here
   ```

7. **Test it works:**
   - Visit: `https://bbb.yourdomain.com`
   - You should see Greenlight interface

---

### Step 2: Deploy to Fly.io

```bash
# Install Fly CLI (if not already installed)
curl -L https://fly.io/install.sh | sh

# Restart your terminal or run:
export FLYCTL_INSTALL="/home/$USER/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Login to Fly
fly auth login

# Navigate to project
cd /home/roman/Documents/rv2class

# Create app (first time only)
fly apps create rv2class

# Set BBB credentials as secrets
fly secrets set BBB_URL="https://bbb.yourdomain.com/bigbluebutton/"
fly secrets set BBB_SECRET="your_secret_from_step_1"

# Deploy!
fly deploy

# Check if it's running
fly status

# View logs
fly logs
```

---

### Step 3: Test Your Deployment

1. **Get your Fly.io URL:**
   ```bash
   fly info
   ```
   Should show: `https://rv2class.fly.dev`

2. **Test a room:**
   Visit: `https://rv2class.fly.dev/room?room=test&name=Teacher&tutor=true`

3. **Should redirect to BBB interface!**

---

## 🎯 Your Students' Links Still Work!

All existing links continue working:
- `https://rv2class.fly.dev/room?room=roman&name=Student1&isTutor=false`
- `https://rv2class.fly.dev/room?room=violet&name=Student2&tutor=true`

**No changes needed for existing students!** 🎉

---

## 🔧 Ongoing Management

### Update Your App
```bash
cd /home/roman/Documents/rv2class
git pull  # or make your changes
fly deploy
```

### Monitor
```bash
# See if app is running
fly status

# View logs
fly logs

# Check resource usage
fly dashboard
```

### Update BBB Credentials
```bash
fly secrets set BBB_URL="new_url"
fly secrets set BBB_SECRET="new_secret"
```

### Scale if needed
```bash
# Add more RAM
fly scale memory 2048

# Add more instances
fly scale count 2
```

---

## 💰 Cost Breakdown

### Option A: Hosted BBB
- Next.js on Fly.io: **$0-5/month** (free tier usually enough)
- Hosted BBB: **$100-300/month**
- **Total: ~$100-300/month**

### Option B: Self-Hosted BBB
- Next.js on Fly.io: **$0-5/month**
- DigitalOcean BBB server: **$40/month**
- **Total: ~$45/month**

---

## 🐛 Troubleshooting

### "Error: Server configuration error"
**Fix:** Check BBB secrets are set:
```bash
fly secrets list
# Should show BBB_URL and BBB_SECRET
```

### "Can't connect to BBB"
**Fix:** Verify BBB server is running:
```bash
ssh root@your-bbb-server
bbb-conf --check
```

### "Room won't load"
**Fix:** Check Fly.io logs:
```bash
fly logs
# Look for errors about BBB_URL or BBB_SECRET
```

### "Video/audio doesn't work in BBB"
**Fix:** Check BBB server firewall:
```bash
# On BBB server
sudo ufw status
# Should allow ports: 80, 443, 16384-32768/udp
```

---

## 📋 Quick Command Reference

```bash
# Fly.io Commands
fly auth login                    # Login
fly deploy                        # Deploy/update app
fly logs                          # View logs
fly status                        # Check status
fly secrets set KEY=value         # Set environment variable
fly secrets list                  # List all secrets
fly dashboard                     # Open web dashboard
fly apps destroy rv2class         # Delete app (careful!)

# BBB Server Commands (SSH into server first)
bbb-conf --check                  # Health check
bbb-conf --secret                 # Show credentials
bbb-conf --restart                # Restart BBB
bbb-conf --status                 # Show active meetings
sudo systemctl status bbb-*       # Check all BBB services
```

---

## 🎉 Success Checklist

- [ ] BBB server is running (DigitalOcean or hosted)
- [ ] `bbb-conf --check` passes all tests (if self-hosted)
- [ ] BBB_URL and BBB_SECRET are saved
- [ ] Fly.io app created (`fly apps create rv2class`)
- [ ] Secrets set in Fly.io (`fly secrets set ...`)
- [ ] App deployed (`fly deploy`)
- [ ] Test room loads: `https://rv2class.fly.dev/room?room=test&name=You&tutor=true`
- [ ] Video/audio works in BBB
- [ ] Existing student links work
- [ ] Tutor can create meetings
- [ ] Student can join meetings

---

## 🆘 Need Help?

**Fly.io Issues:**
- Docs: https://fly.io/docs
- Community: https://community.fly.io

**BBB Issues:**
- Docs: https://docs.bigbluebutton.org
- Community: https://bigbluebutton.org/support
- Check server status: `bbb-conf --check`

**This Project:**
- Check logs: `fly logs`
- Verify secrets: `fly secrets list`
- Test BBB API: `curl "https://bbb.yourdomain.com/bigbluebutton/api"`

---

## 🎊 You're Done!

Your tutoring platform is now running on:
- ✅ BigBlueButton (rock-solid video conferencing)
- ✅ Fly.io (fast, reliable hosting)
- ✅ All existing student links preserved
- ✅ No more "join request accepted but can't join" issues!

**Share your new link with students:**
`https://rv2class.fly.dev/room?room=YOUR_NAME&name=STUDENT_NAME&isTutor=false`

---

## 🔄 Reverting to LiveKit (If Needed)

If you need to go back:

```bash
# Restore backup
mv app/room/page.tsx.livekit.backup app/room/page.tsx

# Reinstall LiveKit packages
npm install @livekit/components-react livekit-client livekit-server-sdk

# Update secrets
fly secrets set LIVEKIT_API_KEY="..."
fly secrets set LIVEKIT_API_SECRET="..."
fly secrets unset BBB_URL BBB_SECRET

# Deploy
fly deploy
```

But hopefully you won't need to! BBB is much more stable. 💪
