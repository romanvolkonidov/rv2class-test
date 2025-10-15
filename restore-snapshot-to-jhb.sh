#!/bin/bash
set -e

export VULTR_API_KEY='W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A'

SNAPSHOT_ID="b214cc21-755e-4245-b7d4-dd586dd043e7"
JHB_INSTANCE_ID="e2a8b25f-c23d-4a75-9dbe-94ad98b6890c"
JHB_IP="139.84.240.149"

echo "🔍 Checking snapshot status..."
SNAPSHOT_STATUS=$(vultr-cli snapshot list -o json | jq -r '.snapshots[] | select(.id=="'$SNAPSHOT_ID'") | .status')

if [ "$SNAPSHOT_STATUS" != "complete" ]; then
    echo "❌ Snapshot is still: $SNAPSHOT_STATUS"
    echo "Please wait and run this script again when status is 'complete'"
    exit 1
fi

echo "✅ Snapshot is ready!"
echo ""
echo "⚠️  WARNING: This will DELETE the current Johannesburg server and replace it!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "🗑️  Deleting current Johannesburg server..."
vultr-cli instance delete $JHB_INSTANCE_ID

echo "⏳ Waiting 10 seconds for deletion..."
sleep 10

echo "🚀 Creating new Johannesburg server from snapshot..."
# Get the plan, region from original
NEW_INSTANCE=$(vultr-cli instance create \
    --region jnb \
    --plan vc2-4c-8gb \
    --snapshot $SNAPSHOT_ID \
    --label "bbb-rv2class-johannesburg-cloned" \
    --host "bbb-jhb" \
    -o json)

NEW_INSTANCE_ID=$(echo $NEW_INSTANCE | jq -r '.instance.id')

echo "✅ New instance created: $NEW_INSTANCE_ID"
echo "⏳ Waiting for instance to boot (60 seconds)..."
sleep 60

echo "🔍 Getting new instance details..."
vultr-cli instance get $NEW_INSTANCE_ID

echo ""
echo "✅ Johannesburg server cloned!"
echo "📝 Next steps:"
echo "1. Update DNS if IP changed"
echo "2. SSH into new server and run: bbb-conf --setip bbb.rv2class.com"
echo "3. Test BBB: https://bbb.rv2class.com"
