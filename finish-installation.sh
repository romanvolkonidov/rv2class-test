#!/bin/bash

# Finish the installation on the already-created VPS
# Server: 207.246.95.30
# Password: eG7[89B2tgdJM=t2

set -e

SERVER_IP="207.246.95.30"
ROOT_PASSWORD="eG7[89B2tgdJM=t2"
JITSI_DOMAIN="jitsi.rv2class.com"
EMAIL="romanvolkonidov@gmail.com"

echo "Connecting to existing VPS and installing Jitsi + Coturn..."
echo "This will take 5-10 minutes..."

sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} bash <<'ENDSSH'
set -e

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# ============================================
# Install Jitsi Meet
# ============================================
echo "Installing Jitsi Meet..."

# Set hostname
hostnamectl set-hostname jitsi.rv2class.com

# Add Jitsi repository
curl -sL https://download.jitsi.org/jitsi-key.gpg.key | apt-key add -
echo "deb https://download.jitsi.org stable/" > /etc/apt/sources.list.d/jitsi-stable.list
apt-get update

# Pre-configure for unattended install
echo "jitsi-videobridge jitsi-videobridge/jvb-hostname string jitsi.rv2class.com" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate" | debconf-set-selections

# Install Jitsi
apt-get install -y jitsi-meet

# Setup Let's Encrypt SSL
/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh <<EOF
romanvolkonidov@gmail.com
EOF

# ============================================
# Install Coturn
# ============================================
echo "Installing Coturn..."

apt-get install -y coturn

# Generate random credentials
TURN_SECRET=$(openssl rand -hex 32)
TURN_USER="rv2class"
TURN_PASSWORD=$(openssl rand -base64 24)

# Get external IP
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

# Enable and start Coturn
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
systemctl enable coturn
systemctl restart coturn

# Configure Jitsi to use Coturn
cat >> /etc/jitsi/meet/jitsi.rv2class.com-config.js <<JITSIEOF

// TURN/STUN Configuration
p2p: {
    enabled: true,
    stunServers: [
        { urls: 'stun:jitsi.rv2class.com:3478' },
        { urls: 'stun:stun.l.google.com:19302' }
    ]
},
JITSIEOF

# Save credentials
cat > /root/credentials.txt <<CREDEOF
╔════════════════════════════════════════════════════════════╗
║           Jitsi + Coturn Credentials                       ║
╚════════════════════════════════════════════════════════════╝

Jitsi Meet URL:
  https://jitsi.rv2class.com

Coturn STUN/TURN:
  STUN: stun:jitsi.rv2class.com:3478
  TURN: turn:jitsi.rv2class.com:3478
  
  Username: ${TURN_USER}
  Password: ${TURN_PASSWORD}
  Secret: ${TURN_SECRET}

Next Steps:
  1. Add DNS A record:
     jitsi.rv2class.com → ${EXTERNAL_IP}
  
  2. Update frontend JitsiRoom.tsx:
     domain: 'jitsi.rv2class.com'
  
  3. Deploy to Vercel:
     git add .
     git commit -m "Switch to self-hosted Jitsi"
     git push

Server IP: ${EXTERNAL_IP}
Root Password: eG7[89B2tgdJM=t2
CREDEOF

chmod 600 /root/credentials.txt

echo "Installation complete!"
cat /root/credentials.txt

ENDSSH

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Retrieving credentials..."
echo "════════════════════════════════════════════════════════════"
echo ""

sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} "cat /root/credentials.txt"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✓ Installation Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "IMPORTANT - Add DNS A Record:"
echo "  jitsi.rv2class.com → 207.246.95.30"
echo ""
echo "Server Password: ${ROOT_PASSWORD}"
echo ""
