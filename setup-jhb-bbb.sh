#!/bin/bash
# Setup script for Johannesburg BBB server after restoration

JHB_IP="139.84.235.125"
JHB_HOSTNAME="bbb-jhb.rv2class.com"

echo "🔧 Setting up Johannesburg BBB server..."
echo "IP: $JHB_IP"
echo "Hostname: $JHB_HOSTNAME"
echo ""

# Step 1: Wait for SSH to be available
echo "⏳ Waiting for SSH access..."
until ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$JHB_IP "echo 'SSH Connected!'" 2>/dev/null; do
    echo "   Still waiting..."
    sleep 30
done

echo "✅ SSH is available!"
echo ""

# Step 2: Update BBB hostname
echo "🔧 Updating BBB hostname to $JHB_HOSTNAME..."
ssh root@$JHB_IP "bbb-conf --setip $JHB_HOSTNAME"

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📝 Next steps:"
echo "1. Add DNS record: $JHB_HOSTNAME → $JHB_IP"
echo "2. Wait 5-10 minutes for DNS to propagate"
echo "3. Test BBB at: https://$JHB_HOSTNAME"
echo "4. Get new secret: ssh root@$JHB_IP 'bbb-conf --secret'"
echo ""
echo "When ready to switch production:"
echo "5. Update main DNS: bbb.rv2class.com → $JHB_IP"
echo "6. Update .env: BBB_URL=https://bbb.rv2class.com/bigbluebutton/"
