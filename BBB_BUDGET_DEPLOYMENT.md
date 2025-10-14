# BBB Deployment for rv2class - Budget Option

## 🎯 Final Architecture

```
Students → online.rv2class.com (Vercel) → BBB Server (Hetzner $6/month)
```

## Step 1: Get Cheap BBB Server

### RECOMMENDED: Hetzner Cloud (Best Value)
**€5.83/month (~$6/month) for 2 teachers with 1-on-1**

1. **Sign up:** https://www.hetzner.com/cloud
2. **Create server:**
   ```
   Type: CPX21
   RAM: 4GB (enough for 2 concurrent 1-on-1 sessions)
   CPU: 3 vCPU
   Location: Choose closest to your students
   Image: Ubuntu 20.04
   Cost: €5.83/month (~$6)
   ```

3. **Get server IP** - save it

### Alternative: Contabo ($6.99/month)
Even cheaper, but slower setup:
- https://contabo.com/en/vps/
- VPS S SSD: 4GB RAM, $6.99/month

---

## Step 2: Install BBB on Server (15 minutes)

```bash
# 1. Point your domain to server
# Add DNS A record: bbb.rv2class.com → YOUR_SERVER_IP
# Wait 5-10 minutes for DNS

# 2. SSH into server
ssh root@YOUR_SERVER_IP

# 3. Install BBB (one command, takes 15 min)
wget -qO- https://ubuntu.bigbluebutton.org/bbb-install-2.7.sh | \
  bash -s -- -w -v focal-270 \
  -s bbb.rv2class.com \
  -e your@email.com

# 4. Get credentials
bbb-conf --secret

# Output will show:
# URL: https://bbb.rv2class.com/bigbluebutton/
# Secret: abc123...
```

**Save these credentials!**

---

## Step 3: Update Your Frontend (2 minutes)

```bash
cd /home/roman/Documents/rv2class

# Set environment variables for Vercel
# We'll add these through Vercel dashboard
```

### Add to Vercel:
1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add:
   ```
   BBB_URL=https://bbb.rv2class.com/bigbluebutton/
   BBB_SECRET=your_secret_from_step_2
   ```
3. Redeploy

---

## Step 4: Deploy to Vercel

```bash
cd /home/roman/Documents/rv2class

# Push to git
git add .
git commit -m "Migrate to BBB"
git push

# Vercel will auto-deploy!
# Or manually:
vercel --prod
```

---

## Step 5: Test

Visit: https://online.rv2class.com/room?room=test&name=Teacher&tutor=true

Should redirect to BBB! ✅

---

## Total Cost: $6-12/month

| Item | Cost |
|------|------|
| Hetzner VPS (4GB) | $6/month |
| Vercel (frontend) | $0 (free tier) |
| Domain (if new) | $12/year |
| **Total** | **~$6-7/month** |

**Much cheaper than $40 DigitalOcean or $100+ hosted!**

---

## Performance for Your Use Case

**Hetzner 4GB server can handle:**
- ✅ 2 concurrent 1-on-1 lessons (your use case)
- ✅ Up to 4 concurrent users total
- ✅ HD video quality
- ✅ Screen sharing
- ✅ Recording

**If you grow:**
- Upgrade to CPX31 (8GB): €11.90/month
- Still cheaper than alternatives!

---

## Quick Setup Script

Want me to create an automated setup script?
