#!/bin/bash

# Check and fix Jitsi server
# Server: 207.246.95.30

SERVER_IP="207.246.95.30"
ROOT_PASSWORD="eG7[89B2tgdJM=t2"

echo "Checking Jitsi server status..."

sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} bash <<'ENDSSH'

echo "════════════════════════════════════════════════════════════"
echo "1. Checking Service Status"
echo "════════════════════════════════════════════════════════════"
systemctl status nginx --no-pager | head -10
systemctl status prosody --no-pager | head -5
systemctl status jicofo --no-pager | head -5
systemctl status jitsi-videobridge2 --no-pager | head -5

echo ""
echo "════════════════════════════════════════════════════════════"
echo "2. Checking Firewall (UFW)"
echo "════════════════════════════════════════════════════════════"
ufw status

echo ""
echo "════════════════════════════════════════════════════════════"
echo "3. Checking Nginx Configuration"
echo "════════════════════════════════════════════════════════════"
nginx -t

echo ""
echo "════════════════════════════════════════════════════════════"
echo "4. Checking Ports"
echo "════════════════════════════════════════════════════════════"
netstat -tlnp | grep -E ':(80|443|3478|5349|10000)'

echo ""
echo "════════════════════════════════════════════════════════════"
echo "5. Checking SSL Certificate"
echo "════════════════════════════════════════════════════════════"
ls -la /etc/letsencrypt/live/jitsi.rv2class.com/ 2>/dev/null || echo "SSL certificate not found!"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "6. Opening Firewall Ports"
echo "════════════════════════════════════════════════════════════"
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 10000/udp
ufw --force enable

echo ""
echo "════════════════════════════════════════════════════════════"
echo "7. Restarting Services"
echo "════════════════════════════════════════════════════════════"
systemctl restart nginx
systemctl restart prosody
systemctl restart jicofo
systemctl restart jitsi-videobridge2
systemctl restart coturn

echo ""
echo "Waiting 5 seconds for services to start..."
sleep 5

echo ""
echo "════════════════════════════════════════════════════════════"
echo "8. Final Status Check"
echo "════════════════════════════════════════════════════════════"
systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Failed"
systemctl is-active prosody && echo "✅ Prosody: Running" || echo "❌ Prosody: Failed"
systemctl is-active jicofo && echo "✅ Jicofo: Running" || echo "❌ Jicofo: Failed"
systemctl is-active jitsi-videobridge2 && echo "✅ JVB: Running" || echo "❌ JVB: Failed"
systemctl is-active coturn && echo "✅ Coturn: Running" || echo "❌ Coturn: Failed"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "9. Test Local Connection"
echo "════════════════════════════════════════════════════════════"
curl -I http://localhost 2>&1 | head -5

ENDSSH

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Testing from your computer..."
echo "════════════════════════════════════════════════════════════"
echo "Testing HTTP (port 80)..."
timeout 5 curl -I http://jitsi.rv2class.com 2>&1 | head -3 || echo "❌ Port 80 not reachable"

echo ""
echo "Testing HTTPS (port 443)..."
timeout 5 curl -I https://jitsi.rv2class.com 2>&1 | head -3 || echo "❌ Port 443 not reachable"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Try accessing: https://jitsi.rv2class.com"
echo "════════════════════════════════════════════════════════════"
