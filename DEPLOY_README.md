# 🚀 Deploy rv2class to Fly.io

## One-Command Deploy

```bash
./deploy-fly-complete.sh
```

## What You Get

- ✅ Next.js application on Fly.io
- ✅ BigBlueButton integration (if configured)
- ✅ Jitsi Meet integration (free, works out of box)
- ✅ Auto-scaling and auto-start
- ✅ HTTPS included
- ✅ Global CDN

## Cost

**~$7-10/month** for main app (first 3 VMs free tier)

## Prerequisites

1. Fly.io account (signup: https://fly.io)
2. BBB credentials (optional, for BigBlueButton)

## Quick Setup

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Deploy
./deploy-fly-complete.sh

# 4. Set BBB secrets (optional)
fly secrets set BBB_URL="https://your-bbb.com/bigbluebutton/" --app rv2class
fly secrets set BBB_SECRET="your-secret" --app rv2class
```

## Your App URL

After deployment: **https://rv2class.fly.dev**

## Documentation

- 📘 **Full Guide**: `FLY_DEPLOYMENT_GUIDE.md`
- 📗 **Quick Ref**: `DEPLOY_QUICK_REF.md`
- 📕 **Summary**: `DEPLOYMENT_SUMMARY.md`

## Support

Issues? Check the guides above or:
- Fly.io Docs: https://fly.io/docs/
- Community: https://community.fly.io/

---

**Ready to deploy?**

```bash
./deploy-fly-complete.sh
```
