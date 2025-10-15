# Fly.io Deployment Guide - Complete Setup
## rv2class + Jitsi/BBB + Coturn TURN Server

## 📋 Overview

This guide covers deploying your rv2class application to Fly.io with support for:
- ✅ **Next.js Application** - Main web app
- ✅ **BigBlueButton Integration** - Enterprise education platform
- ✅ **Jitsi Meet Integration** - Lightweight video conferencing
- ⚠️ **Coturn TURN Server** - WebRTC relay (with limitations on Fly.io)

## 🚀 Quick Start

### Prerequisites
1. Fly.io account (free tier available)
2. Fly CLI installed
3. Docker installed (for local testing)

### One-Command Deploy
```bash
./deploy-fly-complete.sh
```

Then select option 1 or 2 from the menu.

## 📦 What Gets Deployed

### Main Application (`rv2class`)
- **URL**: `https://rv2class.fly.dev`
- **Stack**: Next.js 15 + React 19 + Firebase
- **Features**:
  - Teacher/student video rooms
  - Platform selection (BBB or Jitsi)
  - Real-time join requests
  - Homework management
  - Multi-teacher support

### Coturn TURN Server (`rv2class-coturn`) - Optional
- **Protocol**: STUN/TURN on ports 3478, 5349
- **Purpose**: WebRTC relay for restricted networks
- **Note**: Limited on Fly.io due to UDP port range restrictions

## 🔧 Detailed Deployment Steps

### Step 1: Install Fly CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Restart your terminal after installation
```

### Step 2: Login to Fly.io

```bash
fly auth login
```

### Step 3: Configure Environment Variables

#### Option A: Using the deployment script
```bash
./deploy-fly-complete.sh
# Select option 4 to configure secrets
```

#### Option B: Manual configuration
```bash
# BBB credentials (if using BigBlueButton)
fly secrets set BBB_URL="https://your-bbb-server.com/bigbluebutton/" --app rv2class
fly secrets set BBB_SECRET="your-bbb-shared-secret" --app rv2class

# Firebase is configured in the code, but you can override:
fly secrets set FIREBASE_API_KEY="your-key" --app rv2class
# ... other Firebase config
```

### Step 4: Deploy

#### Deploy Main App Only
```bash
./deploy-fly-complete.sh
# Select option 1
```

Or manually:
```bash
fly deploy --config fly.toml --ha=false
```

#### Deploy with Coturn TURN Server
```bash
./deploy-fly-complete.sh
# Select option 2
```

Or manually:
```bash
# Deploy main app
fly deploy --config fly.toml --ha=false

# Create and deploy Coturn
fly apps create rv2class-coturn
fly ips allocate-v4 --app rv2class-coturn
fly deploy --config fly-coturn.toml --app rv2class-coturn --ha=false
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                                             │
│         Students & Teachers                 │
│                                             │
└──────────────┬──────────────────────────────┘
               │
               │ HTTPS
               │
┌──────────────▼──────────────────────────────┐
│                                             │
│      Fly.io: rv2class.fly.dev              │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │     Next.js Application               │ │
│  │  • Teacher/Student Pages              │ │
│  │  • Platform Selection UI              │ │
│  │  • API Routes                         │ │
│  └───────────┬───────────────────────────┘ │
│              │                               │
└──────────────┼───────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌──────────────┐
│             │  │              │
│  Jitsi      │  │ BigBlueButton│
│  meet.jit.si│  │ (Your Server)│
│             │  │              │
└─────────────┘  └──────────────┘

Optional TURN Server:
┌──────────────────────────────────────────────┐
│  Fly.io: rv2class-coturn (UDP 3478, 5349)   │
│  • STUN/TURN Relay                          │
│  • For restricted networks                   │
│  ⚠️ Limited on Fly.io                        │
└──────────────────────────────────────────────┘
```

## 🔒 Security Configuration

### Required Secrets

```bash
# BigBlueButton (if using)
BBB_URL="https://bbb.rv2class.com/bigbluebutton/"
BBB_SECRET="your-shared-secret"

# Coturn TURN Server (if deploying)
TURN_USER="rvclass"
TURN_PASS="secure-password-here"
```

### Setting Secrets

```bash
# For main app
fly secrets set BBB_URL="..." --app rv2class
fly secrets set BBB_SECRET="..." --app rv2class

# For Coturn
fly secrets set TURN_USER="..." --app rv2class-coturn
fly secrets set TURN_PASS="..." --app rv2class-coturn
```

### View Current Secrets

```bash
fly secrets list --app rv2class
fly secrets list --app rv2class-coturn
```

## 📊 Monitoring & Management

### Check Application Status
```bash
fly status --app rv2class
```

### View Live Logs
```bash
# Main app
fly logs --app rv2class

# Coturn
fly logs --app rv2class-coturn
```

### Open Application in Browser
```bash
fly open --app rv2class
```

### Scale Resources

```bash
# Keep 1 machine running (no auto-stop)
fly scale count 1 --app rv2class

# Increase memory
fly scale memory 1024 --app rv2class

# Increase CPU
fly scale vm shared-cpu-2x --app rv2class
```

### SSH into Machine
```bash
fly ssh console --app rv2class
```

## 🌐 Custom Domain Setup

### Add Custom Domain

```bash
# Add domain
fly certs add rv2class.com --app rv2class

# Check certificate status
fly certs show rv2class.com --app rv2class
```

### DNS Configuration
Add these records to your DNS provider:

```
Type: A
Name: @
Value: [Get from: fly ips list --app rv2class]

Type: AAAA
Name: @
Value: [Get from: fly ips list --app rv2class]

Type: CNAME
Name: www
Value: rv2class.fly.dev
```

## 💰 Cost Estimation

### Free Tier
- 3 shared-cpu-1x VMs with 256MB RAM
- 3GB persistent storage
- 160GB outbound data transfer

### Typical Monthly Cost (Hobby Plan)
```
Main App (1 shared-cpu-1x, 1GB RAM):  $7-10/month
Coturn (1 shared-cpu-1x, 512MB RAM):  $5-7/month
Total:                                ~$12-17/month
```

### Cost Optimization
```bash
# Auto-stop when idle (saves money)
fly scale count 0 --app rv2class  # Auto-starts on request

# Use smaller machines
fly scale vm shared-cpu-1x --app rv2class
```

## 🔧 Troubleshooting

### Build Fails

**Issue**: Docker build fails
```bash
# Check local build
docker build -t rv2class .

# View detailed logs
fly logs --app rv2class
```

**Common fixes**:
- Clear Next.js cache: `rm -rf .next`
- Update dependencies: `npm install`
- Check Dockerfile syntax

### Application Won't Start

**Issue**: App crashes on startup
```bash
# Check logs
fly logs --app rv2class

# Common issues:
# - Missing environment variables
# - Node version mismatch
# - Standalone output not configured
```

**Fix**:
```bash
# Ensure standalone output in next.config.js
output: 'standalone'

# Check secrets are set
fly secrets list --app rv2class
```

### Can't Connect to BBB

**Issue**: BBB meetings fail
```bash
# Verify secrets
fly secrets list --app rv2class | grep BBB

# Test BBB connection
fly ssh console --app rv2class
curl $BBB_URL
```

**Fix**:
- Verify BBB_URL ends with `/bigbluebutton/`
- Check BBB_SECRET is correct
- Ensure BBB server is accessible from internet

### Coturn Not Working

**Issue**: TURN relay fails

**Known Limitation**: Fly.io doesn't support UDP port ranges well (49152-65535)

**Solutions**:
1. **Use Jitsi's public STUN** (default in our config)
2. **Deploy Coturn on dedicated VPS**:
   - DigitalOcean Droplet ($6/month)
   - Linode ($5/month)
   - AWS EC2 t3.micro
3. **Use managed TURN service**:
   - Twilio (pay per use)
   - Xirsys (free tier available)

### Performance Issues

**Issue**: Slow response times
```bash
# Check metrics
fly metrics --app rv2class

# Scale up
fly scale memory 1024 --app rv2class
fly scale vm shared-cpu-2x --app rv2class
```

## 🔄 Updates & Deployments

### Deploy New Version
```bash
# Pull latest code
git pull

# Deploy
fly deploy --app rv2class
```

### Rollback to Previous Version
```bash
# List releases
fly releases --app rv2class

# Rollback to specific version
fly releases rollback v42 --app rv2class
```

### Zero-Downtime Deployment
```bash
# Scale to 2 machines temporarily
fly scale count 2 --app rv2class

# Deploy (rolling update)
fly deploy --app rv2class --strategy rolling

# Scale back to 1
fly scale count 1 --app rv2class
```

## 🧪 Testing Deployment

### Local Testing with Docker

```bash
# Build locally
docker build -t rv2class .

# Run locally
docker run -p 8080:8080 \
  -e BBB_URL="..." \
  -e BBB_SECRET="..." \
  rv2class

# Test
open http://localhost:8080
```

### Test Deployed App

```bash
# Test main page
curl https://rv2class.fly.dev

# Test API endpoint
curl https://rv2class.fly.dev/api/session

# Full test
fly open --app rv2class
```

## 📱 Platform-Specific Testing

### Test BBB Integration
1. Go to `https://rv2class.fly.dev`
2. Click "Start a Lesson"
3. Select teacher
4. Choose "BigBlueButton"
5. Verify BBB interface loads

### Test Jitsi Integration
1. Go to `https://rv2class.fly.dev`
2. Click "Start a Lesson"
3. Select teacher
4. Choose "Jitsi Meet"
5. Verify Jitsi interface loads

### Test Student Join
1. Navigate to student page: `/student/{studentId}`
2. Click "Join Class"
3. Should auto-detect teacher's platform
4. Verify connection

## 🆘 Support Resources

### Fly.io Documentation
- Main: https://fly.io/docs/
- Troubleshooting: https://fly.io/docs/getting-started/troubleshooting/
- Pricing: https://fly.io/docs/about/pricing/

### Community Support
- Fly.io Community: https://community.fly.io/
- Discord: https://fly.io/discord

### Project Documentation
- `JITSI_INTEGRATION_GUIDE.md` - Jitsi setup
- `BBB_SETUP_GUIDE.md` - BigBlueButton setup
- `JITSI_QUICK_START.md` - Quick reference

## 🎯 Production Checklist

Before going live:

- [ ] Set all environment variables/secrets
- [ ] Configure custom domain
- [ ] Enable HTTPS (automatic with Fly.io)
- [ ] Test BBB integration
- [ ] Test Jitsi integration
- [ ] Test student joining flow
- [ ] Set up monitoring/alerts
- [ ] Configure backups (Firebase handles data)
- [ ] Load test with expected user count
- [ ] Set up staging environment
- [ ] Document emergency procedures

## 🚀 Advanced Configuration

### Use Self-Hosted Jitsi
Update `components/JitsiRoom.tsx`:
```typescript
const domain = "jitsi.yourdomain.com";
```

### Add Health Checks
Already configured in `fly.toml`:
```toml
[[http_service.checks]]
  interval = "15s"
  timeout = "10s"
  method = "GET"
  path = "/"
```

### Enable Metrics
```bash
fly metrics --app rv2class
```

## 🔐 Security Best Practices

1. **Secrets Management**
   - Never commit secrets to git
   - Use `fly secrets` for all sensitive data
   - Rotate secrets regularly

2. **Network Security**
   - Force HTTPS (enabled by default)
   - Use Fly.io's built-in DDoS protection
   - Implement rate limiting in API routes

3. **Access Control**
   - Implement proper authentication
   - Use Firebase security rules
   - Validate all inputs

## 📈 Scaling Strategy

### Vertical Scaling
```bash
# More memory
fly scale memory 2048 --app rv2class

# Better CPU
fly scale vm dedicated-cpu-1x --app rv2class
```

### Horizontal Scaling
```bash
# Multiple instances
fly scale count 3 --app rv2class

# Multi-region
fly regions add ams fra --app rv2class
```

## 🎉 Conclusion

Your rv2class application is now deployed on Fly.io with:
- ✅ Multi-platform video support (BBB + Jitsi)
- ✅ Auto-scaling and auto-start
- ✅ Global CDN and edge caching
- ✅ Automatic HTTPS
- ✅ Simple deployment workflow

**Next Steps**:
1. Test thoroughly with real users
2. Monitor performance and costs
3. Consider dedicated TURN server if needed
4. Set up custom domain
5. Configure monitoring alerts

Happy Teaching! 🎓✨
