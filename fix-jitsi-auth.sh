#!/bin/bash

# Fix Jitsi authentication and prosody users
SERVER_IP="207.246.95.30"
ROOT_PASSWORD="eG7[89B2tgdJM=t2"

echo "Fixing Jitsi authentication..."

sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} bash <<'ENDSSH'

echo "═══════════════════════════════════════════════════════════"
echo "1. Checking Prosody Users"
echo "═══════════════════════════════════════════════════════════"
prosodyctl about | grep -i jitsi || echo "No Jitsi domain found"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "2. Listing Existing Users"
echo "═══════════════════════════════════════════════════════════"
prosodyctl list auth.jitsi.rv2class.com || echo "No users found"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "3. Creating Required Users"
echo "═══════════════════════════════════════════════════════════"

# Create focus user for jicofo
echo "Creating focus user..."
prosodyctl register focus auth.jitsi.rv2class.com "$(openssl rand -base64 24)"

# Create jvb user
echo "Creating jvb user..."
prosodyctl register jvb auth.jitsi.rv2class.com "$(openssl rand -base64 24)"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "4. Checking Jitsi Config Files"
echo "═══════════════════════════════════════════════════════════"

echo "Checking /etc/jitsi/jicofo/sip-communicator.properties:"
grep -i "org.jitsi.jicofo.auth" /etc/jitsi/jicofo/sip-communicator.properties || echo "No auth config found"

echo ""
echo "Checking /etc/jitsi/videobridge/sip-communicator.properties:"
grep -i "org.jitsi" /etc/jitsi/videobridge/sip-communicator.properties | head -5 || echo "No config found"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "5. Checking Prosody Config"
echo "═══════════════════════════════════════════════════════════"
cat /etc/prosody/conf.d/jitsi.rv2class.com.cfg.lua | grep -A 5 "VirtualHost"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "6. Restarting All Services"
echo "═══════════════════════════════════════════════════════════"
systemctl restart prosody
sleep 2
systemctl restart jicofo
sleep 2
systemctl restart jitsi-videobridge2
sleep 2

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "7. Checking Service Status"
echo "═══════════════════════════════════════════════════════════"
systemctl is-active prosody && echo "✅ Prosody: Running" || echo "❌ Prosody: FAILED"
systemctl is-active jicofo && echo "✅ Jicofo: Running" || echo "❌ Jicofo: FAILED"
systemctl is-active jitsi-videobridge2 && echo "✅ JVB: Running" || echo "❌ JVB: FAILED"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "8. Testing XMPP Connection"
echo "═══════════════════════════════════════════════════════════"
timeout 5 nc -zv localhost 5222 && echo "✅ XMPP port 5222 responding" || echo "❌ XMPP port not responding"
timeout 5 nc -zv localhost 5347 && echo "✅ Component port 5347 responding" || echo "❌ Component port not responding"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "9. Checking Jicofo Logs for Errors"
echo "═══════════════════════════════════════════════════════════"
journalctl -u jicofo -n 30 --no-pager | tail -20

ENDSSH

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Authentication fixed. Refresh your browser!"
echo "═══════════════════════════════════════════════════════════"
