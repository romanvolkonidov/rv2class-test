# 🚀 Quick Deployment Reference

## One-Command Deploy

```bash
./deploy-fly-complete.sh
```

## Manual Deployment

### 1. Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

### 2. Login
```bash
fly auth login
```

### 3. Set Secrets
```bash
fly secrets set BBB_URL="https://your-bbb.com/bigbluebutton/" --app rv2class
fly secrets set BBB_SECRET="your-secret" --app rv2class
```

### 4. Deploy
```bash
fly deploy --ha=false
```

## Deployment Status

```bash
# Check status
fly status --app rv2class

# View logs
fly logs --app rv2class

# Open in browser
fly open --app rv2class
```

## Common Commands

```bash
# Scale resources
fly scale memory 1024 --app rv2class

# Scale instances
fly scale count 1 --app rv2class

# Restart app
fly apps restart rv2class

# View metrics
fly metrics --app rv2class

# SSH into machine
fly ssh console --app rv2class
```

## File Checklist

- ✅ `Dockerfile` - Next.js app container
- ✅ `.dockerignore` - Exclude unnecessary files
- ✅ `fly.toml` - Fly.io configuration
- ✅ `next.config.js` - Standalone output enabled
- ✅ `deploy-fly-complete.sh` - Automated deployment

## URLs After Deployment

- **App**: https://rv2class.fly.dev
- **API**: https://rv2class.fly.dev/api/session
- **Logs**: `fly logs --app rv2class`

## Troubleshooting

### Build fails
```bash
# Test locally
docker build -t rv2class .
```

### App crashes
```bash
# Check logs
fly logs --app rv2class
```

### Secrets missing
```bash
# List secrets
fly secrets list --app rv2class
```

## Cost

**Free Tier**: First 3 shared VMs free
**This App**: ~$7-10/month (1GB RAM)
**With Coturn**: +$5-7/month

## Next Steps

1. ✅ Deploy main app
2. 🔧 Configure BBB credentials (if using)
3. 🌐 Add custom domain (optional)
4. 📊 Monitor performance
5. 🎓 Start teaching!

## Support

- **Fly.io Docs**: https://fly.io/docs/
- **Project Guides**: 
  - `FLY_DEPLOYMENT_GUIDE.md` - Full guide
  - `JITSI_INTEGRATION_GUIDE.md` - Jitsi setup
  - `COTURN_ALTERNATIVES.md` - TURN server options

---

**Ready?** Run: `./deploy-fly-complete.sh`
