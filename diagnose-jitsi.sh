#!/bin/bash

# Check and fix Jitsi connection issues
SERVER_IP="207.246.95.30"
ROOT_PASSWORD="eG7[89B2tgdJM=t2"

echo "Diagnosing Jitsi connection issue..."

sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} bash <<'ENDSSH'

echo "═══════════════════════════════════════════════════════════"
echo "1. Checking Service Status"
echo "═══════════════════════════════════════════════════════════"
systemctl is-active prosody && echo "✅ Prosody: Running" || echo "❌ Prosody: Failed"
systemctl is-active jicofo && echo "✅ Jicofo: Running" || echo "❌ Jicofo: Failed"
systemctl is-active jitsi-videobridge2 && echo "✅ JVB: Running" || echo "❌ JVB: Failed"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "2. Checking Prosody Configuration"
echo "═══════════════════════════════════════════════════════════"
prosodyctl check config

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "3. Checking JVB Websocket"
echo "═══════════════════════════════════════════════════════════"
ss -tlnp | grep 9090 || echo "❌ JVB websocket not listening on 9090"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "4. Checking Prosody XMPP"
echo "═══════════════════════════════════════════════════════════"
ss -tlnp | grep 5222 || echo "❌ Prosody not listening on 5222"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "5. Checking for Errors in Logs"
echo "═══════════════════════════════════════════════════════════"
echo "Prosody errors:"
journalctl -u prosody -n 20 --no-pager | grep -i error || echo "No errors"

echo ""
echo "Jicofo errors:"
journalctl -u jicofo -n 20 --no-pager | grep -i error || echo "No errors"

echo ""
echo "JVB errors:"
journalctl -u jitsi-videobridge2 -n 20 --no-pager | grep -i error || echo "No errors"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "6. Restarting Services"
echo "═══════════════════════════════════════════════════════════"
systemctl restart prosody
sleep 2
systemctl restart jicofo
sleep 2
systemctl restart jitsi-videobridge2
sleep 3

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "7. Final Status"
echo "═══════════════════════════════════════════════════════════"
systemctl is-active prosody && echo "✅ Prosody: Running" || echo "❌ Prosody: FAILED"
systemctl is-active jicofo && echo "✅ Jicofo: Running" || echo "❌ Jicofo: FAILED"
systemctl is-active jitsi-videobridge2 && echo "✅ JVB: Running" || echo "❌ JVB: FAILED"

ENDSSH

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Services restarted. Try joining again!"
echo "═══════════════════════════════════════════════════════════"
