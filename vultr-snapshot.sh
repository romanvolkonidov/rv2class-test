#!/bin/bash
# Take Vultr snapshot via API

# Set your Vultr API key here or export as environment variable
# Get it from: https://my.vultr.com/settings/#settingsapi
VULTR_API_KEY="${VULTR_API_KEY:-YOUR_API_KEY_HERE}"

# Your server instance ID (get from Vultr dashboard or API)
INSTANCE_ID="${VULTR_INSTANCE_ID:-}"

# Snapshot description
SNAPSHOT_DESC="rv2class-working-$(date +%Y%m%d-%H%M%S)"

if [ "$VULTR_API_KEY" = "YOUR_API_KEY_HERE" ]; then
    echo "❌ Error: Please set VULTR_API_KEY"
    echo "   Get your API key from: https://my.vultr.com/settings/#settingsapi"
    echo ""
    echo "Usage:"
    echo "  export VULTR_API_KEY='your-api-key'"
    echo "  export VULTR_INSTANCE_ID='your-instance-id'"
    echo "  ./vultr-snapshot.sh"
    exit 1
fi

# If INSTANCE_ID not set, list instances first
if [ -z "$INSTANCE_ID" ]; then
    echo "📋 Fetching your instances..."
    curl -s "https://api.vultr.com/v2/instances" \
      -H "Authorization: Bearer ${VULTR_API_KEY}" | jq -r '.instances[] | "\(.id) - \(.label) - \(.main_ip)"'
    echo ""
    echo "Set your instance ID:"
    echo "  export VULTR_INSTANCE_ID='your-instance-id'"
    exit 1
fi

echo "📸 Taking snapshot of instance: ${INSTANCE_ID}"
echo "Description: ${SNAPSHOT_DESC}"

# Create snapshot
RESPONSE=$(curl -s -X POST "https://api.vultr.com/v2/snapshots" \
  -H "Authorization: Bearer ${VULTR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"instance_id\": \"${INSTANCE_ID}\",
    \"description\": \"${SNAPSHOT_DESC}\"
  }")

# Check if successful
if echo "$RESPONSE" | jq -e '.snapshot.id' > /dev/null 2>&1; then
    SNAPSHOT_ID=$(echo "$RESPONSE" | jq -r '.snapshot.id')
    echo "✅ Snapshot created successfully!"
    echo "Snapshot ID: ${SNAPSHOT_ID}"
    echo "Description: ${SNAPSHOT_DESC}"
    echo ""
    echo "View in dashboard: https://my.vultr.com/snapshots/"
else
    echo "❌ Error creating snapshot:"
    echo "$RESPONSE" | jq .
    exit 1
fi
