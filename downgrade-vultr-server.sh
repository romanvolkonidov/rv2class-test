#!/bin/bash

# Vultr Server Downgrade Script
# Downgrades from vc2-4c-8gb ($40/mo) to vc2-2c-4gb ($20/mo)
# Saves $240/year

set -e

API_KEY="W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A"
OLD_INSTANCE_ID="a97b8ea2-394e-4d8d-b356-8267ce54d168"
NEW_PLAN="vc2-2c-4gb"
REGION="ewr"
SSH_KEY_ID="2e1c3a91-8fdd-46b0-a0f8-6253d2065271"  # bbb-server SSH key

echo "🔒 Step 1: Creating snapshot of current server..."
SNAPSHOT_RESPONSE=$(curl -s -X POST "https://api.vultr.com/v2/snapshots" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"instance_id\": \"$OLD_INSTANCE_ID\", \"description\": \"Pre-downgrade backup $(date +%Y%m%d-%H%M%S)\"}")

echo "$SNAPSHOT_RESPONSE" | jq '.'

SNAPSHOT_ID=$(echo "$SNAPSHOT_RESPONSE" | jq -r '.snapshot.id // empty')

if [ -z "$SNAPSHOT_ID" ]; then
  echo "❌ Failed to create snapshot"
  exit 1
fi

echo "✅ Snapshot created: $SNAPSHOT_ID"
echo "⏳ Waiting 60 seconds for snapshot to complete..."
sleep 60

echo ""
echo "📋 Step 2: Creating new instance with cheaper plan ($NEW_PLAN - \$20/mo)..."

NEW_INSTANCE_RESPONSE=$(curl -s -X POST "https://api.vultr.com/v2/instances" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"region\": \"$REGION\",
    \"plan\": \"$NEW_PLAN\",
    \"snapshot_id\": \"$SNAPSHOT_ID\",
    \"label\": \"rv2class-downgraded\",
    \"hostname\": \"app.rv2class.com\",
    \"enable_ipv6\": false,
    \"backups\": \"disabled\",
    \"sshkey_id\": [\"$SSH_KEY_ID\"]
  }")

echo "$NEW_INSTANCE_RESPONSE" | jq '.'

NEW_INSTANCE_ID=$(echo "$NEW_INSTANCE_RESPONSE" | jq -r '.instance.id // empty')

if [ -z "$NEW_INSTANCE_ID" ]; then
  echo "❌ Failed to create new instance"
  echo "$NEW_INSTANCE_RESPONSE"
  exit 1
fi

NEW_IP=$(echo "$NEW_INSTANCE_RESPONSE" | jq -r '.instance.main_ip')

echo "✅ New instance created: $NEW_INSTANCE_ID"
echo "📍 New IP address: $NEW_IP"
echo ""
echo "⏳ Waiting 120 seconds for new server to boot..."
sleep 120

echo ""
echo "✅ NEW SERVER READY!"
echo ""
echo "📝 NEXT STEPS (MANUAL):"
echo "1. Update DNS A record for app.rv2class.com to point to: $NEW_IP"
echo "2. Wait for DNS propagation (5-30 minutes)"
echo "3. Test the new server: https://app.rv2class.com"
echo "4. Once verified working, delete old instance with:"
echo "   curl -X DELETE \"https://api.vultr.com/v2/instances/$OLD_INSTANCE_ID\" \\"
echo "     -H \"Authorization: Bearer $API_KEY\""
echo ""
echo "💰 Savings: \$20/month (\$240/year)"
echo ""
echo "Old server will NOT be deleted automatically for safety."
echo "Keep both running until you verify the new one works."
