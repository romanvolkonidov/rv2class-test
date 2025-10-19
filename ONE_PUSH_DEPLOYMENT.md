# ✅ ONE PUSH = EVERYTHING UPDATES! 🚀

## YES! Now you can just `git push` and both Jitsi AND Frontend will update!

### 🎯 What Happens When You Git Push:

```bash
# On your local machine:
git add .
git commit -m "Update something"
git push
```

**GitHub Actions automatically:**
1. ✅ Pulls latest code on `108.61.245.179`
2. ✅ Installs npm dependencies
3. ✅ Creates `.env.local` with correct Jitsi domain
4. ✅ Builds Next.js frontend
5. ✅ **Copies Jitsi config files** from `jitsi-custom/` to `/etc/jitsi/meet/`
6. ✅ Restarts Prosody, Jicofo, Jitsi Videobridge
7. ✅ Reloads Nginx
8. ✅ Restarts PM2 frontend

---

## 📋 What Gets Deployed:

### Frontend (Next.js)
- All code in `components/`, `app/`, `lib/`, etc.
- Updated `.env.local` with `NEXT_PUBLIC_JITSI_DOMAIN=app.rv2class.com`
- Rebuilt production bundle

### Jitsi Configuration
- `jitsi-custom/jitsi-meet/config.js` → `/etc/jitsi/meet/app.rv2class.com-config.js`
- `jitsi-custom/jitsi-meet/interface_config.js` → `/usr/share/jitsi-meet/interface_config.js`

### Services Restarted
- **Jitsi:** Prosody + Jicofo + Videobridge
- **Web Server:** Nginx
- **Frontend:** PM2 (rv2class process)

---

## 🧪 Example Workflow:

### Scenario: You want to change prejoin settings

**Step 1:** Edit `components/JitsiRoom.tsx` locally
```typescript
configOverwrite: {
  prejoinPageEnabled: false, // Disable prejoin
  // ... other settings
}
```

**Step 2:** Push to GitHub
```bash
git add components/JitsiRoom.tsx
git commit -m "Disable prejoin screen"
git push
```

**Step 3:** GitHub Actions runs automatically
- Watch it here: https://github.com/romanvolkonidov/rv2class-test/actions
- Takes ~2-3 minutes

**Step 4:** Done! ✅
- Visit `https://app.rv2class.com`
- Changes are live immediately

---

## 🎨 Example: Update Jitsi Server Config

### Scenario: Change lobby settings on server

**Step 1:** Edit `jitsi-custom/jitsi-meet/config.js`
```javascript
config.lobbyEnabled = false; // Disable lobby entirely
```

**Step 2:** Push to GitHub
```bash
git add jitsi-custom/jitsi-meet/config.js
git commit -m "Disable Jitsi lobby feature"
git push
```

**Step 3:** GitHub Actions:
- Copies updated `config.js` to `/etc/jitsi/meet/app.rv2class.com-config.js`
- Restarts Jitsi services
- Done! ✅

---

## 📊 View Deployment Status

### On GitHub:
1. Go to: https://github.com/romanvolkonidov/rv2class-test/actions
2. Click on latest workflow run
3. Watch live logs

### On Server (SSH):
```bash
ssh root@108.61.245.179

# Check services
systemctl status prosody jicofo jitsi-videobridge2 nginx
pm2 status

# Check logs
pm2 logs rv2class
journalctl -u prosody -f
```

---

## ⚡ Quick Changes

### Change Jitsi Domain:
```bash
# Edit .github/workflows/deploy.yml
NEXT_PUBLIC_JITSI_DOMAIN=newdomain.com

git push  # Auto-updates everywhere!
```

### Update Firebase Config:
```bash
# Edit .github/workflows/deploy.yml
# Update NEXT_PUBLIC_FIREBASE_* variables

git push  # Auto-rebuilds with new config!
```

---

## 🔒 Secrets Management

Your workflow uses GitHub Secrets:
- `SERVER_IP` = `108.61.245.179`
- `SERVER_PASSWORD` = `R2n@ww2TPS3(M8PF`

To update them:
1. Go to: https://github.com/romanvolkonidov/rv2class-test/settings/secrets/actions
2. Update values
3. Next deployment will use new secrets

---

## 🚨 Manual Deployment

If GitHub Actions fails, you can always deploy manually:

```bash
ssh root@108.61.245.179

cd /var/www/rv2class
git pull origin main
npm install
npm run build

# Copy Jitsi configs
cp jitsi-custom/jitsi-meet/config.js /etc/jitsi/meet/app.rv2class.com-config.js
cp jitsi-custom/jitsi-meet/interface_config.js /usr/share/jitsi-meet/interface_config.js

# Restart services
systemctl restart prosody jicofo jitsi-videobridge2
systemctl reload nginx
pm2 restart rv2class
```

---

## 🎯 Summary

**Question:** Is it right that I can just push to git and both jitsi and frontend will update?

**Answer:** **YES! ✅** 

One `git push` now updates:
- ✅ Next.js Frontend (code + env vars)
- ✅ Jitsi Config Files (server-side settings)
- ✅ All Services (Jitsi + Nginx + PM2)

Everything on `app.rv2class.com` stays in sync with your git repository! 🚀
