# Complete Setup: Everything on 108.61.245.179

## ✅ What's Done

1. **Frontend Updated**
   - Changed Jitsi domain from `jitsi.rv2class.com` → `app.rv2class.com`
   - Enabled prejoin & lobby features
   - Excluded `jitsi-custom/` from Next.js build
   - All changes committed to git

2. **Server `108.61.245.179`**
   - ✅ Frontend running (PM2 `rv2class` online)
   - ❌ Jitsi NOT yet installed
   - ❌ Coturn NOT yet installed

## 🎯 Next Steps: Install Jitsi on 108.61.245.179

### Step 1: SSH to server
```bash
ssh root@108.61.245.179
# Password: R2n@ww2TPS3(M8PF
```

### Step 2: Install Jitsi Meet
```bash
# Update system
apt-get update

# Add Jitsi repository
curl https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmor > /usr/share/keyrings/jitsi-keyring.gpg
echo 'deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/' | tee /etc/apt/sources.list.d/jitsi-stable.list
apt-get update

# Pre-configure domain (avoids interactive prompts)
echo "jitsi-videobridge jitsi-videobridge/jvb-hostname string app.rv2class.com" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate" | debconf-set-selections

# Install Jitsi
DEBIAN_FRONTEND=noninteractive apt-get install -y jitsi-meet

# Install Coturn
apt-get install -y coturn
```

### Step 3: Deploy Your Custom Jitsi Config
**From your local machine:**
```bash
cd /home/roman/Documents/rv2class-test

# Copy your modified config.js (with prejoin/lobby enabled)
scp jitsi-custom/jitsi-meet/config.js root@108.61.245.179:/etc/jitsi/meet/app.rv2class.com-config.js

# Copy interface_config.js
scp jitsi-custom/jitsi-meet/interface_config.js root@108.61.245.179:/usr/share/jitsi-meet/interface_config.js
```

### Step 4: Get SSL Certificate
**On the server:**
```bash
# Make sure DNS app.rv2class.com points to 108.61.245.179 first!
/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh
# Enter your email when prompted
```

### Step 5: Configure Coturn
**On the server:**
```bash
# Generate secret
TURN_SECRET=$(openssl rand -hex 32)

# Create Coturn config
cat > /etc/turnserver.conf << EOF
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=$TURN_SECRET
realm=app.rv2class.com
total-quota=100
stale-nonce=600
cert=/etc/letsencrypt/live/app.rv2class.com/fullchain.pem
pkey=/etc/letsencrypt/live/app.rv2class.com/privkey.pem
no-loopback-peers
no-multicast-peers
mobility
no-cli
EOF

# Enable and start Coturn
systemctl enable coturn
systemctl restart coturn
```

### Step 6: Update Frontend & Restart All Services
**On the server:**
```bash
cd /var/www/rv2class

# Pull latest code (with app.rv2class.com domain)
git pull origin main

# Update .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tracking-budget-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://tracking-budget-app-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tracking-budget-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tracking-budget-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=912992088190
NEXT_PUBLIC_FIREBASE_APP_ID=1:912992088190:web:926c8826b3bc39e2eb282f
NEXT_PUBLIC_JITSI_DOMAIN=app.rv2class.com
EOF

# Rebuild frontend
npm run build

# Restart everything
systemctl restart prosody jicofo jitsi-videobridge2 coturn nginx
pm2 restart rv2class
```

## 🧪 Testing

### Test Jitsi directly:
1. Open: `https://app.rv2class.com`
2. Create a test room
3. Verify prejoin screen appears
4. Verify lobby features work

### Test Frontend:
1. Open: `https://app.rv2class.com` (your Next.js app)
2. Join as teacher/student
3. Check that video calls connect properly

## 🔄 Future Updates (One Push Updates Everything!)

Once setup is complete, any git push will trigger GitHub Actions to:
1. Pull latest code on server
2. Update both frontend AND Jitsi config
3. Rebuild and restart services

```bash
# On your local machine:
git add .
git commit -m "Update feature"
git push

# GitHub Actions automatically:
# - Deploys frontend
# - Copies new Jitsi config files
# - Restarts services
```

## 📝 Important Notes

1. **DNS Required**: Point `app.rv2class.com` to `108.61.245.179` before getting SSL
2. **Old Server**: `207.246.95.30` can be ignored for now (or deleted later)
3. **jitsi-custom Directory**: 
   - IS part of your repo
   - Contains Jitsi server config files
   - Gets deployed to `/etc/jitsi/meet/` on server
   - Excluded from Next.js build (but still used!)

## 🎯 Summary

**Before:**
- Frontend on one server, Jitsi on another
- Two separate systems to manage

**After:**
- Everything on `108.61.245.179`
- One server, one domain (`app.rv2class.com`)
- One git push updates both frontend AND Jitsi
- Clean, simple, maintainable! 🚀
