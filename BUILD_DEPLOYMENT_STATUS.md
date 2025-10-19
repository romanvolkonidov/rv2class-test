# Jitsi Build & Deployment Status

## Current Issue
- **Problem**: Jitsi Meet webpack build takes 20-30 minutes on first run, exceeding GitHub Actions SSH timeout
- **Impact**: Custom React code (annotations, toolbar, room name hiding) wasn't being deployed

## Solutions Implemented

### 1. ✅ Improved GitHub Actions Workflow
**File**: `.github/workflows/deploy.yml`

**Key Improvements**:
- **Persistent `node_modules`**: Backs up and restores node_modules to avoid reinstalling 2000+ packages every time
- **Background build**: Uses `nohup` to run build in background, survives SSH disconnects
- **Progress monitoring**: Shows build progress every 30 seconds
- **Timeout handling**: 30-minute timeout with graceful fallback to existing build
- **Build reuse**: If build times out but files exist, deployment continues

**What it does**:
1. Backs up `node_modules` before git reset
2. Restores `node_modules` after pulling code
3. Skips npm install if dependencies unchanged
4. Runs `make` in background with nohup
5. Monitors progress for up to 30 minutes
6. Copies built files to `/usr/share/jitsi-meet/`
7. Restarts services

### 2. ✅ Manual Rebuild Script
**File**: `rebuild-jitsi-on-server.sh`

**Usage**:
```bash
./rebuild-jitsi-on-server.sh
```

**What it does**:
- SSHs into production server
- Checks for node_modules
- Starts build in background with nohup
- Provides monitoring commands
- Gives deployment instructions

**Monitor build**:
```bash
ssh root@108.61.245.179
tail -f /tmp/jitsi-build.log
```

**Check progress**:
```bash
grep -E 'webpack.Progress|building' /tmp/jitsi-build.log | tail -5
```

**Deploy after build completes**:
```bash
cd /var/www/rv2class/jitsi-custom/jitsi-meet
cp -r css libs sounds images fonts static lang *.html *.js /usr/share/jitsi-meet/
systemctl reload nginx
```

## Build Timeline
- **First build** (clean): 20-30 minutes
  - Downloads 2000+ npm packages
  - Compiles 4000+ TypeScript/React files
  - Minifies JavaScript bundles
  
- **Incremental builds** (after node_modules exist): 2-5 minutes
  - Reuses cached dependencies
  - Only recompiles changed files

## Custom Features Waiting for Build
Once the build completes, these will be deployed:

✅ **Annotation Button**: Custom SVG button in toolbar
✅ **Right Toolbar**: Repositioned from top to right side
✅ **Room Name Hiding**: Teacher rooms won't show names on prejoin/conference
✅ **Prejoin Centering**: Fixed vertical positioning issue

## Current Deployment Status
- Latest commit: `7823f58` - "Add manual rebuild script for server"
- GitHub Actions: Will trigger automatically
- Expected: Build will run in background for 20-30 minutes

## How to Check Deployment Success

### 1. Monitor GitHub Actions
Go to: https://github.com/romanvolkonidov/rv2class-test/actions

Watch for:
- ✅ "Build started (PID: ...)"
- ⏱ Progress updates every 30 seconds
- ✅ "Build completed successfully!"

### 2. SSH into Server
```bash
ssh root@108.61.245.179
tail -f /tmp/jitsi-build.log
```

Look for:
- `100% [0] done plugins` - Build complete
- Final webpack output

### 3. Verify Built Files
```bash
ssh root@108.61.245.179 "ls -lh /var/www/rv2class/jitsi-custom/jitsi-meet/libs/app.bundle.min.js"
```

Should show file size around 15-30 MB with recent timestamp.

### 4. Test on Production
Visit: `https://app.rv2class.com/teacher-7mvdpkpy`

Check:
- ✅ Annotation button appears in toolbar (looks like pencil/drawing icon)
- ✅ Toolbar is on right side (not top)
- ✅ Room name "teacher-7mvdpkpy" is hidden on prejoin
- ✅ Room name is hidden in conference view
- ✅ Prejoin content is vertically centered

## Troubleshooting

### If GitHub Actions Times Out Again
Run manual build:
```bash
./rebuild-jitsi-on-server.sh
```

Or SSH directly:
```bash
ssh root@108.61.245.179
cd /var/www/rv2class/jitsi-custom/jitsi-meet
nohup make > /tmp/jitsi-build.log 2>&1 &
# Disconnect, wait 20-30 min, reconnect
tail /tmp/jitsi-build.log
```

### If Build Fails
Check logs:
```bash
ssh root@108.61.245.179
cat /tmp/jitsi-build.log
```

Common issues:
- Out of memory: Server needs at least 8GB RAM
- Node version: Needs Node 20+ (but works with 18 using --legacy-peer-deps)
- Disk space: Needs ~5GB free

### If Deployment Succeeds But Features Don't Appear
1. Hard refresh browser: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. Clear browser cache
3. Check bundle was copied: `ssh root@108.61.245.179 "ls -lh /usr/share/jitsi-meet/libs/app.bundle.min.js"`
4. Check Nginx reloaded: `ssh root@108.61.245.179 "systemctl status nginx"`

## Next Steps
1. ✅ Wait for GitHub Actions build to complete (check Actions tab)
2. ✅ Verify build completed on server
3. ✅ Test custom features on production
4. ✅ If timeout occurs, run manual rebuild script
5. ✅ Monitor `/tmp/jitsi-build.log` for completion

## Code Changes Summary
- **PreMeetingScreen.tsx**: Hide room name for teacher rooms, fix centering
- **SubjectText.tsx**: Return null for teacher room names
- **Annotation system**: Custom toolbar button, drawing canvas
- **Workflow**: Persistent node_modules, background builds, timeout handling

All changes are committed and will be deployed once build completes! 🎉
