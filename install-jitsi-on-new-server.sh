#!/bin/bash

# Install Jitsi Meet + Coturn on 108.61.245.179
# This will make the server have EVERYTHING in one place

set -e

SERVER_IP="108.61.245.179"
SERVER_PASS="R2n@ww2TPS3(M8PF"
DOMAIN="app.rv2class.com"  # We'll use this domain for Jitsi too
EMAIL="your-email@example.com"  # Change this!

echo "========================================="
echo "Installing Jitsi + Coturn on New Server"
echo "Server: $SERVER_IP"
echo "Domain: $DOMAIN"
echo "========================================="

# Install Jitsi Meet
echo "📦 Installing Jitsi Meet..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'

set -e

echo "=== 1. Update system ==="
apt-get update

echo "=== 2. Install Jitsi repository ==="
curl https://download.jitsi.org/jitsi-key.gpg.key | sh -c 'gpg --dearmor > /usr/share/keyrings/jitsi-keyring.gpg'
echo 'deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/' | tee /etc/apt/sources.list.d/jitsi-stable.list
apt-get update

echo "=== 3. Pre-configure Jitsi ==="
# Set domain via debconf to avoid interactive prompts
echo "jitsi-videobridge jitsi-videobridge/jvb-hostname string app.rv2class.com" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate (You will later get a chance to obtain a Let's encrypt certificate)" | debconf-set-selections

echo "=== 4. Install Jitsi Meet ==="
DEBIAN_FRONTEND=noninteractive apt-get install -y jitsi-meet

echo "=== 5. Install Coturn (STUN/TURN) ==="
apt-get install -y coturn

echo "✅ Jitsi Meet + Coturn installed!"

ENDSSH

echo ""
echo "=== 6. Copy your custom Jitsi config from repo ==="
echo "Deploying config.js and interface_config.js..."

# Copy your modified config files to the server
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
  jitsi-custom/jitsi-meet/config.js \
  root@$SERVER_IP:/etc/jitsi/meet/app.rv2class.com-config.js

sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
  jitsi-custom/jitsi-meet/interface_config.js \
  root@$SERVER_IP:/usr/share/jitsi-meet/interface_config.js

echo "=== 7. Configure Coturn ==="
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'

# Generate Coturn secret
TURN_SECRET=$(openssl rand -hex 32)

# Configure Coturn
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
cipher-list="ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384"
no-loopback-peers
no-multicast-peers
mobility
no-cli
EOF

# Update Jitsi to use Coturn
cat >> /etc/jitsi/meet/app.rv2class.com-config.js << EOF

// Coturn STUN/TURN configuration
config.p2p.stunServers = [
    { urls: 'stun:app.rv2class.com:3478' }
];
EOF

# Enable and start Coturn
systemctl enable coturn
systemctl restart coturn

echo "✅ Coturn configured!"

ENDSSH

echo "=== 8. Update Frontend to use local Jitsi ==="
# The frontend should now point to app.rv2class.com instead of jitsi.rv2class.com
# We'll update this in the code

echo "=== 9. Restart all services ==="
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'

systemctl restart prosody
systemctl restart jicofo
systemctl restart jitsi-videobridge2
systemctl restart coturn
systemctl restart nginx

# Rebuild and restart frontend
cd /var/www/rv2class
npm run build
pm2 restart rv2class

echo "✅ All services restarted!"

ENDSSH

echo ""
echo "========================================="
echo "✅ INSTALLATION COMPLETE!"
echo "========================================="
echo ""
echo "🎯 Next steps:"
echo "1. Point app.rv2class.com DNS to $SERVER_IP"
echo "2. Get SSL certificate: ssh root@$SERVER_IP '/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh'"
echo "3. Update frontend code to use app.rv2class.com for Jitsi"
echo "4. Test: https://app.rv2class.com"
echo ""
echo "📝 Note: Frontend will be updated to use local Jitsi (app.rv2class.com)"
echo ""
