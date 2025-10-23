#!/bin/bash

# Monitor deployment progress on server

SERVER_IP="108.61.245.179"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"

echo "🔍 Monitoring server deployment progress..."
echo "Press Ctrl+C to stop monitoring"
echo ""

while true; do
    clear
    echo "════════════════════════════════════════════════════════"
    echo "  📊 RV2Class Deployment Monitor"
    echo "  Time: $(date '+%H:%M:%S')"
    echo "════════════════════════════════════════════════════════"
    echo ""
    
    # Check running processes
    echo "🔄 Running processes:"
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP \
        'ps aux | grep -E "npm|node|make|webpack" | grep -v grep | awk "{print \$11, \$12, \$13}" | head -5' 2>/dev/null || echo "  None"
    
    echo ""
    echo "📦 Node modules count:"
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP \
        'ls -1 /tmp/jitsi-meet/node_modules 2>/dev/null | wc -l' 2>/dev/null || echo "  0"
    
    echo ""
    echo "📋 Recent activity:"
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP \
        'tail -3 /tmp/build.log 2>/dev/null' || echo "  No build log yet"
    
    echo ""
    echo "💾 Disk usage:"
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP \
        'du -sh /tmp/jitsi-meet 2>/dev/null' || echo "  Calculating..."
    
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "Refreshing in 5 seconds... (Ctrl+C to stop)"
    sleep 5
done
