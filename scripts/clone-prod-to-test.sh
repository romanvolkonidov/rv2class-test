#!/bin/bash

# Vultr Server Cloning Script
# This script creates a snapshot of the production server and can restore it to the test server

set -e  # Exit on error

# Configuration
VULTR_API_KEY="W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A"
PROD_INSTANCE_ID="31c86db7-75f6-4354-8858-94b301bd20a5"  # jitsi-coturn-rv2class
TEST_INSTANCE_ID="75baae01-a079-48a9-9f8a-5196c1ad3a5b"  # jitsi-test
PROD_IP="207.246.95.30"
TEST_IP="45.63.0.93"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make Vultr API calls
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

# Function to wait for snapshot completion
wait_for_snapshot() {
    local snapshot_id=$1
    echo -e "${YELLOW}Waiting for snapshot to complete...${NC}"
    
    while true; do
        status=$(vultr_api GET "snapshots/$snapshot_id" | jq -r '.snapshot.status')
        
        if [ "$status" == "complete" ]; then
            echo -e "${GREEN}✓ Snapshot completed successfully!${NC}"
            break
        elif [ "$status" == "pending" ] || [ "$status" == "null" ]; then
            echo -n "."
            sleep 10
        else
            echo -e "${RED}✗ Snapshot failed with status: $status${NC}"
            exit 1
        fi
    done
}

# Function to wait for instance to be ready
wait_for_instance() {
    local instance_id=$1
    echo -e "${YELLOW}Waiting for instance to be ready...${NC}"
    
    while true; do
        status=$(vultr_api GET "instances/$instance_id" | jq -r '.instance.status')
        power_status=$(vultr_api GET "instances/$instance_id" | jq -r '.instance.power_status')
        
        if [ "$status" == "active" ] && [ "$power_status" == "running" ]; then
            echo -e "${GREEN}✓ Instance is ready!${NC}"
            break
        else
            echo -n "."
            sleep 10
        fi
    done
}

echo "================================================"
echo "   Vultr Production to Test Server Cloning"
echo "================================================"
echo ""
echo "Production Server: $PROD_IP (ID: $PROD_INSTANCE_ID)"
echo "Test Server: $TEST_IP (ID: $TEST_INSTANCE_ID)"
echo ""

# Menu
echo "What would you like to do?"
echo "1) Create snapshot of production server"
echo "2) List available snapshots"
echo "3) Restore snapshot to test server (DESTRUCTIVE!)"
echo "4) Full clone: Snapshot prod → Restore to test"
echo "5) Get server information"
echo "q) Quit"
echo ""
read -p "Enter your choice: " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Creating snapshot of production server...${NC}"
        
        timestamp=$(date +%Y%m%d-%H%M%S)
        snapshot_name="jitsi-prod-backup-$timestamp"
        
        result=$(vultr_api POST "snapshots/create-from-instance" "{
            \"instance_id\": \"$PROD_INSTANCE_ID\",
            \"description\": \"$snapshot_name\"
        }")
        
        snapshot_id=$(echo "$result" | jq -r '.snapshot.id')
        
        if [ "$snapshot_id" != "null" ] && [ -n "$snapshot_id" ]; then
            echo -e "${GREEN}✓ Snapshot created with ID: $snapshot_id${NC}"
            echo "Snapshot name: $snapshot_name"
            
            wait_for_snapshot "$snapshot_id"
            
            echo ""
            echo -e "${GREEN}Snapshot is ready! You can now restore it to the test server.${NC}"
            echo "Snapshot ID: $snapshot_id"
        else
            echo -e "${RED}✗ Failed to create snapshot${NC}"
            echo "$result" | jq '.'
            exit 1
        fi
        ;;
        
    2)
        echo ""
        echo -e "${YELLOW}Fetching snapshots...${NC}"
        
        snapshots=$(vultr_api GET "snapshots")
        
        echo ""
        echo "$snapshots" | jq -r '.snapshots[] | "ID: \(.id)\nDescription: \(.description)\nSize: \(.size) GB\nStatus: \(.status)\nCreated: \(.date_created)\n---"'
        ;;
        
    3)
        echo ""
        echo -e "${RED}⚠️  WARNING: This will DESTROY all data on the test server!${NC}"
        echo -e "${RED}⚠️  The test server ($TEST_IP) will be rebuilt from snapshot.${NC}"
        echo ""
        read -p "Enter snapshot ID to restore: " snapshot_id
        
        if [ -z "$snapshot_id" ]; then
            echo -e "${RED}No snapshot ID provided. Aborting.${NC}"
            exit 1
        fi
        
        echo ""
        read -p "Are you ABSOLUTELY sure? Type 'YES' to confirm: " confirm
        
        if [ "$confirm" != "YES" ]; then
            echo "Aborting."
            exit 0
        fi
        
        echo ""
        echo -e "${YELLOW}Restoring snapshot to test server...${NC}"
        
        result=$(vultr_api POST "instances/$TEST_INSTANCE_ID/restore" "{
            \"snapshot_id\": \"$snapshot_id\"
        }")
        
        if echo "$result" | jq -e '.instance' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Restore initiated successfully!${NC}"
            
            wait_for_instance "$TEST_INSTANCE_ID"
            
            echo ""
            echo -e "${GREEN}✓ Test server restored from snapshot!${NC}"
            echo ""
            echo "IMPORTANT: You will need to update the following:"
            echo "1. Hostname configuration in /etc/hostname and /etc/hosts"
            echo "2. Jitsi domain configuration in /etc/jitsi/meet configs"
            echo "3. SSL certificates (generate new ones for test domain)"
            echo "4. Any firewall rules or DNS settings"
        else
            echo -e "${RED}✗ Failed to restore snapshot${NC}"
            echo "$result" | jq '.'
            exit 1
        fi
        ;;
        
    4)
        echo ""
        echo -e "${YELLOW}Full clone operation: Production → Test${NC}"
        echo -e "${RED}⚠️  This will DESTROY all data on the test server!${NC}"
        echo ""
        read -p "Type 'YES' to proceed with full clone: " confirm
        
        if [ "$confirm" != "YES" ]; then
            echo "Aborting."
            exit 0
        fi
        
        # Step 1: Create snapshot
        echo ""
        echo -e "${YELLOW}Step 1/2: Creating snapshot of production server...${NC}"
        
        timestamp=$(date +%Y%m%d-%H%M%S)
        snapshot_name="jitsi-prod-backup-$timestamp"
        
        result=$(vultr_api POST "snapshots/create-from-instance" "{
            \"instance_id\": \"$PROD_INSTANCE_ID\",
            \"description\": \"$snapshot_name\"
        }")
        
        snapshot_id=$(echo "$result" | jq -r '.snapshot.id')
        
        if [ "$snapshot_id" == "null" ] || [ -z "$snapshot_id" ]; then
            echo -e "${RED}✗ Failed to create snapshot${NC}"
            echo "$result" | jq '.'
            exit 1
        fi
        
        echo -e "${GREEN}✓ Snapshot created: $snapshot_id${NC}"
        wait_for_snapshot "$snapshot_id"
        
        # Step 2: Restore to test
        echo ""
        echo -e "${YELLOW}Step 2/2: Restoring snapshot to test server...${NC}"
        
        result=$(vultr_api POST "instances/$TEST_INSTANCE_ID/restore" "{
            \"snapshot_id\": \"$snapshot_id\"
        }")
        
        if echo "$result" | jq -e '.instance' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Restore initiated!${NC}"
            wait_for_instance "$TEST_INSTANCE_ID"
            
            echo ""
            echo -e "${GREEN}========================================${NC}"
            echo -e "${GREEN}✓ CLONE COMPLETED SUCCESSFULLY!${NC}"
            echo -e "${GREEN}========================================${NC}"
            echo ""
            echo "Snapshot ID: $snapshot_id"
            echo "Snapshot Name: $snapshot_name"
            echo ""
            echo -e "${YELLOW}Next steps:${NC}"
            echo "1. SSH into test server: ssh root@$TEST_IP"
            echo "2. Update hostname and Jitsi configuration"
            echo "3. Generate new SSL certificates for test domain"
            echo "4. Test the installation"
        else
            echo -e "${RED}✗ Failed to restore snapshot${NC}"
            echo "$result" | jq '.'
            exit 1
        fi
        ;;
        
    5)
        echo ""
        echo -e "${YELLOW}Fetching server information...${NC}"
        echo ""
        
        echo "=== PRODUCTION SERVER ==="
        vultr_api GET "instances/$PROD_INSTANCE_ID" | jq '.instance | {
            id: .id,
            label: .label,
            os: .os,
            ram: .ram,
            vcpu_count: .vcpu_count,
            disk: .disk,
            main_ip: .main_ip,
            status: .status,
            power_status: .power_status,
            region: .region
        }'
        
        echo ""
        echo "=== TEST SERVER ==="
        vultr_api GET "instances/$TEST_INSTANCE_ID" | jq '.instance | {
            id: .id,
            label: .label,
            os: .os,
            ram: .ram,
            vcpu_count: .vcpu_count,
            disk: .disk,
            main_ip: .main_ip,
            status: .status,
            power_status: .power_status,
            region: .region
        }'
        ;;
        
    q|Q)
        echo "Exiting."
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "Done!"
