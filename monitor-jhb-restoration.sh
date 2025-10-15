#!/bin/bash
export VULTR_API_KEY='W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A'

INSTANCE_ID="107fe8fd-38f5-437b-bbaf-5c6d00d2622f"
NEW_IP="139.84.235.125"

echo "🔍 Monitoring Johannesburg server restoration..."
echo "Instance ID: $INSTANCE_ID"
echo "New IP: $NEW_IP"
echo ""

while true; do
    echo "$(date '+%H:%M:%S') - Checking status..."
    
    # Try to SSH
    if timeout 5 ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$NEW_IP "echo 'SSH Connected!'" 2>/dev/null; then
        echo ""
        echo "✅ SERVER IS RUNNING AND ACCESSIBLE!"
        echo ""
        echo "Next steps:"
        echo "1. Update DNS: bbb.rv2class.com → $NEW_IP"
        echo "2. SSH in and run: bbb-conf --setip bbb.rv2class.com"
        echo "3. Update environment: BBB_URL=https://bbb.rv2class.com/bigbluebutton/"
        break
    else
        echo "   Still restoring... (will check again in 2 minutes)"
        sleep 120
    fi
done
