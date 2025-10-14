# BigBlueButton on Fly.io Deployment Guide

## Quick Setup

### Step 1: Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login to Fly
```bash
fly auth login
```

### Step 3: Deploy BBB to Fly.io

**Option A: Use Existing BBB Server (Recommended)**
If you already have a BBB server running elsewhere:
1. Just add the credentials to your Next.js app
2. Skip to "Next.js Deployment" section

**Option B: Deploy BBB on Fly.io (Complex)**
BBB is resource-intensive and requires:
- 8GB RAM minimum
- Multiple services (nginx, redis, freeswitch, etc.)
- Not ideal for Fly.io's architecture

**Recommendation:** Use a hosted BBB provider or VPS for BBB server.

### Step 4: Set Fly Secrets for Next.js App
```bash
cd /home/roman/Documents/rv2class

# Set BBB credentials
fly secrets set BBB_URL="https://your-bbb-server.com/bigbluebutton/"
fly secrets set BBB_SECRET="your_secret_here"
```

### Step 5: Create fly.toml for Next.js App
See fly.toml in root directory

### Step 6: Deploy
```bash
fly deploy
```

## Recommended BBB Server Options

### Option 1: DigitalOcean Droplet ($40/month)
```bash
# Create a $40/month droplet (8GB RAM, 4 vCPU)
# SSH into it and run:
wget -qO- https://ubuntu.bigbluebutton.org/bbb-install-2.7.sh | \
  bash -s -- -w -v focal-270 \
  -s bbb.yourdomain.com \
  -e your@email.com

# Get credentials
bbb-conf --secret
```

### Option 2: Hetzner Cloud (€30/month - Best Value)
- CX41: 8GB RAM, 4 vCPU, 160GB SSD
- Cheaper than DigitalOcean
- Excellent network

### Option 3: Hosted BBB Service (Easiest)
- **Blindside Networks**: https://blindsidenetworks.com
- **BigBlueButton.hosting**: https://bigbluebutton.hosting
- Pay per usage, no server management

## Cost Comparison

| Option | Monthly Cost | Pros | Cons |
|--------|--------------|------|------|
| Self-host (DO) | $40 | Full control | Manage server |
| Self-host (Hetzner) | €30 | Cheap, fast | EU only |
| Hosted (Blindside) | $100-500 | Zero maintenance | More expensive |
| Fly.io (BBB) | Not recommended | - | Too complex |

## Fly.io for Next.js Only

Fly.io is perfect for your Next.js app, not for BBB server.

**Architecture:**
```
[Students/Teachers]
      ↓
[Next.js on Fly.io] ← You're here
      ↓
[BBB Server on DigitalOcean/Hetzner] ← Deploy BBB here
```
