#!/bin/bash
# Quick automated Vultr clone script - NO QUESTIONS ASKED
set -e

VULTR_API_KEY="W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A"
PROD_INSTANCE_ID="31c86db7-75f6-4354-8858-94b301bd20a5"
TEST_INSTANCE_ID="75baae01-a079-48a9-9f8a-5196c1ad3a5b"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

vultr_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            "https://api.vultr.com/v2/$endpoint" \
            -H "Authorization: Bearer $VULTR_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" \
            "https://api.vultr.com/v2/$endpoint" \
            -H "Authorization: Bearer $VULTR_API_KEY"
    fi
}

wait_for_snapshot() {
    local snapshot_id=$1
    echo -e "${YELLOW}Waiting for snapshot...${NC}"
    while true; do
        status=$(vultr_api GET "snapshots/$snapshot_id" | jq -r '.snapshot.status')
        if [ "$status" == "complete" ]; then
            echo -e "${GREEN}✓ Snapshot ready!${NC}"
            break
        fi
        echo -n "."
        sleep 10
    done
}

wait_for_instance() {
    local instance_id=$1
    echo -e "${YELLOW}Waiting for instance...${NC}"
    while true; do
        status=$(vultr_api GET "instances/$instance_id" | jq -r '.instance.status')
        power=$(vultr_api GET "instances/$instance_id" | jq -r '.instance.power_status')
        if [ "$status" == "active" ] && [ "$power" == "running" ]; then
            echo -e "${GREEN}✓ Instance ready!${NC}"
            break
        fi
        echo -n "."
        sleep 10
    done
}

echo "========================================"
echo "  CLONING PRODUCTION → TEST"
echo "========================================"
echo ""

# Step 1: Create snapshot
echo -e "${YELLOW}[1/2] Creating snapshot...${NC}"
timestamp=$(date +%Y%m%d-%H%M%S)
snapshot_name="jitsi-prod-$timestamp"

result=$(vultr_api POST "snapshots" "{\"instance_id\": \"$PROD_INSTANCE_ID\", \"description\": \"$snapshot_name\"}")

snapshot_id=$(echo "$result" | jq -r '.snapshot.id')

if [ "$snapshot_id" == "null" ] || [ -z "$snapshot_id" ]; then
    echo -e "${RED}✗ Failed to create snapshot${NC}"
    echo "$result" | jq '.'
    exit 1
fi

echo -e "${GREEN}✓ Snapshot ID: $snapshot_id${NC}"
wait_for_snapshot "$snapshot_id"

# Step 2: Restore to test
echo ""
echo -e "${YELLOW}[2/2] Restoring to test server...${NC}"

result=$(vultr_api POST "instances/$TEST_INSTANCE_ID/restore" "{\"snapshot_id\": \"$snapshot_id\"}")

if echo "$result" | jq -e '.instance' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Restore initiated!${NC}"
    wait_for_instance "$TEST_INSTANCE_ID"
    
    echo ""
    echo -e "${GREEN}========================================"
    echo "✓ CLONE COMPLETED!"
    echo "========================================${NC}"
    echo ""
    echo "Snapshot: $snapshot_name"
    echo "ID: $snapshot_id"
    echo ""
    echo -e "${YELLOW}Next: SSH to test server and run post-restore-config.sh${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    echo "$result" | jq '.'
    exit 1
fi
