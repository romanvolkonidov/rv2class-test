#!/bin/bash

# Fix SSL Certificate for Jitsi
SERVER_IP="207.246.95.30"
ROOT_PASSWORD="eG7[89B2tgdJM=t2"

echo "Installing SSL certificate..."

sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} bash <<'ENDSSH'

echo "Installing certbot..."
apt-get update
apt-get install -y certbot

echo ""
echo "Generating SSL certificate..."
/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh <<EOF
romanvolkonidov@gmail.com
EOF

echo ""
echo "Checking certificate..."
ls -la /etc/letsencrypt/live/jitsi.rv2class.com/

echo ""
echo "Restarting services..."
systemctl restart nginx coturn

echo ""
echo "✅ SSL Certificate installed!"

ENDSSH

echo ""
echo "Testing HTTPS..."
sleep 3
curl -I https://jitsi.rv2class.com 2>&1 | head -10

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Jitsi should now be accessible at:"
echo "   https://jitsi.rv2class.com"
echo "════════════════════════════════════════════════════════════"
