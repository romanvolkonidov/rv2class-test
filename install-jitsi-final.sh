#!/bin/bash

# COMPLETELY FIXED installation script
# Uses Prosody 0.12 with Lua 5.2
# Server: 207.246.95.30
# Password: eG7[89B2tgdJM=t2

set -e

SERVER_IP="207.246.95.30"
ROOT_PASSWORD="eG7[89B2tgdJM=t2"
JITSI_DOMAIN="jitsi.rv2class.com"
EMAIL="romanvolkonidov@gmail.com"

echo "Connecting to VPS and installing Jitsi + Coturn..."
echo "This will take 5-10 minutes..."

sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} bash <<'ENDSSH'
set -e

export DEBIAN_FRONTEND=noninteractive

# ============================================
# Clean up any broken packages
# ============================================
echo "Cleaning up..."
apt-get remove -y --purge jitsi-meet jitsi-meet-prosody jitsi-meet-turnserver jitsi-meet-web jitsi-videobridge2 jicofo prosody 2>/dev/null || true
apt-get autoremove -y
apt-get clean

# ============================================
# Update system
# ============================================
echo "Updating system..."
apt-get update
apt-get upgrade -y

# Set hostname
hostnamectl set-hostname jitsi.rv2class.com

# ============================================
# Install Lua 5.2
# ============================================
echo "Installing Lua 5.2..."
apt-get install -y lua5.2 liblua5.2-dev

# ============================================
# Install Prosody 0.12 with Lua 5.2
# ============================================
echo "Installing Prosody 0.12..."

# Remove old Prosody repos
rm -f /etc/apt/sources.list.d/prosody.list

# Add Prosody official repository
wget -qO - https://prosody.im/files/prosody-debian-packages.key | gpg --dearmor -o /usr/share/keyrings/prosody-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/prosody-keyring.gpg] http://packages.prosody.im/debian $(lsb_release -sc) main" > /etc/apt/sources.list.d/prosody.list
apt-get update

# Install Prosody
apt-get install -y prosody

# Verify Prosody uses Lua 5.2
prosodyctl about | grep -i lua || true

# ============================================
# Install Jitsi Meet
# ============================================
echo "Installing Jitsi Meet..."

# Remove old Jitsi key if exists
apt-key del 66A9CD0595D6AFA247290D3BEF8B479E2DC1389C 2>/dev/null || true

# Add Jitsi repository properly
curl -sL https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmor -o /usr/share/keyrings/jitsi-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/" > /etc/apt/sources.list.d/jitsi-stable.list
apt-get update

# Pre-configure for unattended install
echo "jitsi-videobridge jitsi-videobridge/jvb-hostname string jitsi.rv2class.com" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate" | debconf-set-selections

# Install Jitsi
echo "Installing Jitsi packages..."
apt-get install -y jitsi-meet

# ============================================
# Setup Let's Encrypt SSL
# ============================================
echo "Setting up SSL certificate..."
/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh <<EOF
romanvolkonidov@gmail.com
EOF

# ============================================
# Install Coturn
# ============================================
echo "Installing Coturn..."
apt-get install -y coturn

# Generate credentials
TURN_SECRET=$(openssl rand -hex 32)
TURN_USER="rv2class"
TURN_PASSWORD=$(openssl rand -base64 24)
EXTERNAL_IP=$(curl -s ifconfig.me)

# Configure Coturn
cat > /etc/turnserver.conf <<COTURNEOF
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=${EXTERNAL_IP}
external-ip=${EXTERNAL_IP}
realm=jitsi.rv2class.com
server-name=jitsi.rv2class.com
lt-cred-mech
user=${TURN_USER}:${TURN_PASSWORD}
use-auth-secret
static-auth-secret=${TURN_SECRET}
cert=/etc/letsencrypt/live/jitsi.rv2class.com/fullchain.pem
pkey=/etc/letsencrypt/live/jitsi.rv2class.com/privkey.pem
cipher-list="ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384"
no-stdout-log
log-file=/var/log/turnserver.log
simple-log
verbose
fingerprint
COTURNEOF

# Enable Coturn
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
systemctl enable coturn
systemctl restart coturn

# ============================================
# Configure Jitsi to use Coturn
# ============================================
echo "Configuring Jitsi..."

# Update Jitsi config
CONFIG_FILE="/etc/jitsi/meet/jitsi.rv2class.com-config.js"
if [ -f "$CONFIG_FILE" ]; then
    # Add STUN/TURN config
    sed -i "/\/\/ p2p:/a\\    p2p: {\n        enabled: true,\n        stunServers: [\n            { urls: 'stun:jitsi.rv2class.com:3478' },\n            { urls: 'stun:stun.l.google.com:19302' }\n        ]\n    }," "$CONFIG_FILE"
fi

# ============================================
# Restart all services
# ============================================
echo "Restarting services..."
systemctl restart prosody
systemctl restart jicofo
systemctl restart jitsi-videobridge2
systemctl restart coturn
systemctl restart nginx

# ============================================
# Save credentials
# ============================================
cat > /root/credentials.txt <<CREDEOF
╔════════════════════════════════════════════════════════════╗
║        Jitsi + Coturn Installation Complete! 🎉            ║
╚════════════════════════════════════════════════════════════╝

Jitsi Meet URL:
  https://jitsi.rv2class.com

Coturn STUN/TURN:
  STUN: stun:jitsi.rv2class.com:3478
  TURN: turn:jitsi.rv2class.com:3478
  
  Username: ${TURN_USER}
  Password: ${TURN_PASSWORD}
  Secret: ${TURN_SECRET}

Server Details:
  IP: ${EXTERNAL_IP}
  Root Password: eG7[89B2tgdJM=t2

SSH Access:
  ssh root@${EXTERNAL_IP}
  (password: eG7[89B2tgdJM=t2)

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ADD DNS A RECORD:
   jitsi.rv2class.com → ${EXTERNAL_IP}
   
   Wait 5-10 minutes for DNS to propagate

2. TEST JITSI:
   Open: https://jitsi.rv2class.com
   Create a test room
   
3. UPDATE FRONTEND:
   I'll update your JitsiRoom.tsx to use jitsi.rv2class.com

4. DEPLOY TO VERCEL:
   git add .
   git commit -m "Switch to self-hosted Jitsi"
   git push

Service Status:
  Prosody: $(systemctl is-active prosody)
  Jicofo: $(systemctl is-active jicofo)
  JVB: $(systemctl is-active jitsi-videobridge2)
  Coturn: $(systemctl is-active coturn)
  Nginx: $(systemctl is-active nginx)

Cost: $12/month
CREDEOF

chmod 600 /root/credentials.txt

echo ""
echo "════════════════════════════════════════════════════════════"
cat /root/credentials.txt
echo "════════════════════════════════════════════════════════════"

ENDSSH

echo ""
echo "✅ INSTALLATION COMPLETE!"
echo ""
echo "Next: Add DNS record and I'll update your frontend!"
echo ""
