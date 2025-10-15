# 🔧 Fix Jitsi "config is not defined" Error

## Problem Summary

Your Jitsi integration shows this error:
```
ReferenceError: config is not defined
```

This happens because the `config.js` file on your Jitsi server (`jitsi.rv2class.com`) either:
1. Has syntax errors (broken URLs, missing declarations)
2. Isn't accessible via HTTPS
3. Has improper JavaScript formatting

## ✅ Solution

### Step 1: SSH into Your Jitsi Server

```bash
ssh root@jitsi.rv2class.com
```

### Step 2: Download and Run the Diagnostic Script

```bash
# Download the diagnostic script
curl -o diagnose-and-fix-jitsi-config.sh https://raw.githubusercontent.com/romanvolkonidov/rv2class/main/diagnose-and-fix-jitsi-config.sh

# Make it executable
chmod +x diagnose-and-fix-jitsi-config.sh

# Run it
sudo ./diagnose-and-fix-jitsi-config.sh
```

**OR** if you're on your local machine, copy the script:

```bash
cd /home/roman/Documents/rv2class
scp diagnose-and-fix-jitsi-config.sh root@jitsi.rv2class.com:/root/
ssh root@jitsi.rv2class.com
cd /root
sudo ./diagnose-and-fix-jitsi-config.sh
```

### Step 3: Verify the Fix

After running the script, test your Jitsi server:

1. **Direct Jitsi Test:**
   - Open: https://jitsi.rv2class.com/testroom123
   - You should see the Jitsi interface load without errors

2. **Check config.js is accessible:**
   ```bash
   curl https://jitsi.rv2class.com/config.js | head -20
   ```
   
   You should see:
   ```javascript
   var config = {
       hosts: {
           domain: 'jitsi.rv2class.com',
           muc: 'conference.jitsi.rv2class.com'
       },
       bosh: 'https://jitsi.rv2class.com/http-bind',
       websocket: 'wss://jitsi.rv2class.com/xmpp-websocket',
       ...
   ```

3. **Test from Your App:**
   - Go to: https://online.rv2class.com
   - Start a lesson
   - Check browser console - no more "config is not defined" errors

## 🔍 What the Script Does

The diagnostic script will:

1. ✅ Check if config file exists
2. ✅ Create a backup
3. ✅ Check for JavaScript syntax errors
4. ✅ Ensure proper `var config = {` declaration
5. ✅ Fix broken BOSH URL
6. ✅ Fix broken WebSocket URL
7. ✅ Validate hosts configuration
8. ✅ Check for balanced braces/brackets
9. ✅ Validate critical configuration sections
10. ✅ Create minimal working config if needed
11. ✅ Set proper file permissions
12. ✅ Test HTTPS accessibility
13. ✅ Restart all Jitsi services
14. ✅ Verify service status

## 🐛 If Problems Persist

### Check Nginx Configuration

```bash
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/jitsi.rv2class.com.conf | grep -A5 "location.*config.js"
```

Make sure config.js is served correctly:
```nginx
location = /config.js {
    alias /etc/jitsi/meet/jitsi.rv2class.com-config.js;
}
```

### Check Prosody Status

```bash
sudo systemctl status prosody
sudo journalctl -u prosody -n 50
```

### Manual Config Check

```bash
sudo nano /etc/jitsi/meet/jitsi.rv2class.com-config.js
```

Ensure the file starts with:
```javascript
var config = {
    hosts: {
        domain: 'jitsi.rv2class.com',
        muc: 'conference.jitsi.rv2class.com'
    },
    bosh: 'https://jitsi.rv2class.com/http-bind',
    websocket: 'wss://jitsi.rv2class.com/xmpp-websocket',
```

### Check Browser Console

Open https://jitsi.rv2class.com/testroom and check:
1. Network tab - is `config.js` loaded? (HTTP 200?)
2. Console tab - any JavaScript errors?

## 📝 Common Issues

### Issue 1: Broken URLs in config.js

**Symptom:** Multi-line URLs like:
```javascript
bosh: 'https://jitsi.rv2class.com/' + subdir + 'htt
p-bind',
```

**Fix:** The script automatically fixes this.

### Issue 2: Missing 'var' declaration

**Symptom:**
```javascript
config = {  // ❌ Missing 'var'
```

**Fix:**
```javascript
var config = {  // ✅ Correct
```

### Issue 3: Nginx not serving config.js

**Check:**
```bash
curl -I https://jitsi.rv2class.com/config.js
```

Should return `HTTP/2 200`.

If it returns `404`, add to Nginx config:
```bash
sudo nano /etc/nginx/sites-enabled/jitsi.rv2class.com.conf
```

Add:
```nginx
location = /config.js {
    alias /etc/jitsi/meet/jitsi.rv2class.com-config.js;
}
```

Then:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## ✨ After Successful Fix

Your Jitsi meetings should work from both:
- ✅ Direct: https://jitsi.rv2class.com/room123
- ✅ Embedded: https://online.rv2class.com (your app)

No more console errors! 🎉
