# 🚀 Automated Deployment Guide

This guide shows you how to automatically deploy your local changes to your Vultr production server.

## 📋 What You Have

- **Production Server IP**: 207.246.95.30
- **Backup Snapshot**: ✅ Available on Vultr (can restore anytime!)
- **Two Deployment Methods**: Local cron OR GitHub Actions

---

## 🎯 Quick Start (Easiest Method)

### Option 1: Manual Deployment (Recommended First Time)

Run this anytime you want to deploy:

```bash
chmod +x deploy-to-production.sh
./deploy-to-production.sh
```

This will:
1. ✅ Commit your local changes
2. ✅ Push to GitHub
3. ✅ SSH into your server
4. ✅ Pull latest code
5. ✅ Build the app
6. ✅ Restart the server

**Super simple!** Just run it whenever you want to deploy.

---

## ⏰ Automatic Nightly Deployment

### Option A: Local Cron (Your Computer Must Be On)

```bash
chmod +x setup-auto-deploy.sh
./setup-auto-deploy.sh
```

This sets up a cron job that runs every night at 2 AM (or your chosen time).

**Pros**: 
- Easy setup
- Runs on your machine

**Cons**: 
- Your computer must be on and awake
- Won't work if computer is off

---

### Option B: GitHub Actions (Cloud-Based - Recommended!)

This runs in the cloud, so your computer can be off! ☁️

#### Setup Instructions:

1. **Add Secrets to GitHub**:
   - Go to: https://github.com/romanvolkonidov/rv2class-test/settings/secrets/actions
   - Click "New repository secret"
   - Add these two secrets:
     - Name: `SERVER_IP` → Value: `207.246.95.30`
     - Name: `SERVER_PASSWORD` → Value: `eG7[89B2tgdJM=t2`

2. **Push the workflow**:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add auto-deployment workflow"
   git push
   ```

3. **Done!** 
   - Deploys automatically every night at 2 AM UTC
   - Can also trigger manually from GitHub Actions tab

**Pros**:
- ✅ Runs in the cloud (computer can be off!)
- ✅ Free with GitHub
- ✅ Can deploy manually from GitHub website
- ✅ Email notifications on failure

**Cons**:
- Requires GitHub secrets setup (one-time)

---

## 🔄 Typical Workflow

### Daily Coding:
1. Make changes to your code locally
2. Test on `localhost:3000`
3. That's it! The automatic deployment will handle the rest at night

### When You Want Immediate Deployment:
```bash
./deploy-to-production.sh
```

---

## 📊 Monitoring Deployments

### Local Cron Logs:
```bash
tail -f deployment.log
```

### GitHub Actions:
- Go to: https://github.com/romanvolkonidov/rv2class-test/actions
- See all deployment runs, logs, and status

### Check Production Server:
```bash
ssh root@207.246.95.30
pm2 logs rv2class
```

---

## 🛡️ Safety Features

### Snapshot Restore (If Something Goes Wrong)

1. Go to Vultr Dashboard: https://my.vultr.com/
2. Select your server: `jitsi-coturn-rv2class`
3. Click "Snapshots" tab
4. Click "Restore" on your snapshot
5. Confirm - server will be back to snapshot state in ~5 minutes

**Important**: The snapshot is a COMPLETE restore:
- ✅ All files
- ✅ All configurations
- ✅ Database state
- ✅ Everything!

---

## 🧪 Testing Before Deployment

Always test locally first:
```bash
npm run dev
# Visit localhost:3000
# Test your changes
```

Then deploy:
```bash
./deploy-to-production.sh
```

---

## 📝 Useful Commands

```bash
# Manual deployment
./deploy-to-production.sh

# View scheduled cron jobs
crontab -l

# Edit cron jobs
crontab -e

# View deployment logs
tail -f deployment.log

# Check server status
ssh root@207.246.95.30 'pm2 status'

# View server logs
ssh root@207.246.95.30 'pm2 logs'
```

---

## 🎨 Customization

### Change Deployment Time:
Edit `.github/workflows/deploy.yml`:
```yaml
schedule:
  - cron: '0 2 * * *'  # Change to your preferred time (UTC)
```

Or for local cron:
```bash
crontab -e
# Edit the time in the cron job
```

---

## ❓ Troubleshooting

### Deployment Failed?
1. Check logs: `tail -f deployment.log`
2. Try manual deployment: `./deploy-to-production.sh`
3. If still fails, restore snapshot from Vultr

### Can't Connect to Server?
```bash
ssh root@207.246.95.30
# If this fails, check Vultr dashboard
```

### App Not Restarting?
```bash
ssh root@207.246.95.30
pm2 restart rv2class
# or
pm2 restart all
```

---

## 🎯 Recommendation

**For you, I recommend:**

1. **Start with manual deployment** to verify it works:
   ```bash
   ./deploy-to-production.sh
   ```

2. **Then set up GitHub Actions** for automatic nightly deployment:
   - Add the two secrets to GitHub
   - Push the workflow file
   - Sleep peacefully knowing deployments happen automatically! 😴

3. **Keep your snapshot** - it's your safety net!

---

## 📞 Quick Reference

- **Manual Deploy**: `./deploy-to-production.sh`
- **Setup Auto Deploy**: `./setup-auto-deploy.sh`
- **View Logs**: `tail -f deployment.log`
- **Server IP**: 207.246.95.30
- **SSH**: `ssh root@207.246.95.30`
- **Restore Snapshot**: Vultr Dashboard → Snapshots → Restore

---

**Happy Deploying! 🚀**
