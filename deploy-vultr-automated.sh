#!/bin/bash

###############################################################################
# Automated Jitsi + Coturn Deployment using Vultr API
# Creates VPS, installs everything, configures automatically
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_header() { echo -e "${PURPLE}[STEP]${NC} $1"; }

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     Automated Jitsi + Coturn Deployment on Vultr             ║"
echo "║     Using Vultr API for Full Automation                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# Configuration
###############################################################################

VULTR_API_KEY="W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A"
API_URL="https://api.vultr.com/v2"

###############################################################################
# Helper Functions
###############################################################################

vultr_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $VULTR_API_KEY" \
            -H "Content-Type: application/json" \
            "$API_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $VULTR_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint"
    fi
}

###############################################################################
# Step 1: Check API Key
###############################################################################

print_header "Step 1: Verifying Vultr API access..."

account_info=$(vultr_api GET "/account")
if echo "$account_info" | grep -q "account"; then
    print_success "Vultr API access verified!"
else
    print_error "Invalid Vultr API key or connection failed"
    exit 1
fi

###############################################################################
# Step 2: Get User Configuration
###############################################################################

print_header "Step 2: Configuration..."

echo ""
echo "What would you like to deploy?"
echo "  1) Both Jitsi + Coturn (Recommended) - $18/month"
echo "  2) Only Coturn - $6/month"
echo "  3) Only Jitsi - $12/month"
echo ""
read -p "Choose (1/2/3): " deploy_choice

case $deploy_choice in
    1)
        DEPLOY_JITSI=true
        DEPLOY_COTURN=true
        ;;
    2)
        DEPLOY_JITSI=false
        DEPLOY_COTURN=true
        ;;
    3)
        DEPLOY_JITSI=true
        DEPLOY_COTURN=false
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Get domain info
if [ "$DEPLOY_JITSI" = true ]; then
    read -p "Enter domain for Jitsi (e.g., jitsi.rv2class.com): " JITSI_DOMAIN
    read -p "Enter your email for SSL certificate: " SSL_EMAIL
    
    if [ -z "$JITSI_DOMAIN" ] || [ -z "$SSL_EMAIL" ]; then
        print_error "Domain and email are required!"
        exit 1
    fi
fi

###############################################################################
# Step 3: Get Available Regions
###############################################################################

print_header "Step 3: Selecting region..."

print_status "Available regions:"
regions=$(vultr_api GET "/regions")

# Extract and display some key regions
echo "  1) jnb  - Johannesburg (closest to you)"
echo "  2) fra  - Frankfurt"
echo "  3) lhr  - London"
echo "  4) ewr  - New Jersey"
echo "  5) sjc  - Silicon Valley"

read -p "Choose region (default: jnb): " region_choice
case $region_choice in
    1|"") REGION="jnb" ;;
    2) REGION="fra" ;;
    3) REGION="lhr" ;;
    4) REGION="ewr" ;;
    5) REGION="sjc" ;;
    *) REGION="jnb" ;;
esac

print_success "Selected region: $REGION"

###############################################################################
# Step 4: Get OS and Plan
###############################################################################

print_header "Step 4: Selecting server configuration..."

# Get OS ID for Ubuntu 22.04
os_list=$(vultr_api GET "/os")
OS_ID=1743  # Ubuntu 22.04 LTS x64

# Select plan based on deployment
if [ "$DEPLOY_JITSI" = true ]; then
    PLAN="vc2-2c-4gb"  # $12/month - 2 vCPU, 4GB RAM
    print_status "Using plan: vc2-2c-4gb ($12/month) for Jitsi"
else
    PLAN="vc2-1c-1gb"  # $6/month - 1 vCPU, 1GB RAM
    print_status "Using plan: vc2-1c-1gb ($6/month) for Coturn only"
fi

###############################################################################
# Step 5: Generate SSH Key (if needed)
###############################################################################

print_header "Step 5: Setting up SSH access..."

SSH_KEY_PATH="$HOME/.ssh/vultr_rv2class"

if [ ! -f "$SSH_KEY_PATH" ]; then
    print_status "Generating new SSH key..."
    ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "vultr-rv2class"
    print_success "SSH key generated: $SSH_KEY_PATH"
else
    print_status "Using existing SSH key: $SSH_KEY_PATH"
fi

# Upload SSH key to Vultr
print_status "Uploading SSH key to Vultr..."
SSH_PUB_KEY=$(cat "${SSH_KEY_PATH}.pub")
ssh_key_response=$(vultr_api POST "/ssh-keys" "{
    \"name\": \"rv2class-key\",
    \"ssh_key\": \"$SSH_PUB_KEY\"
}")

SSH_KEY_ID=$(echo "$ssh_key_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$SSH_KEY_ID" ]; then
    print_success "SSH key uploaded: $SSH_KEY_ID"
else
    # Key might already exist, get existing keys
    existing_keys=$(vultr_api GET "/ssh-keys")
    SSH_KEY_ID=$(echo "$existing_keys" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_warning "Using existing SSH key: $SSH_KEY_ID"
fi

###############################################################################
# Step 6: Create Startup Script
###############################################################################

print_header "Step 6: Preparing installation scripts..."

# Create combined startup script
STARTUP_SCRIPT=$(cat << 'SCRIPT_END'
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install basic tools
apt-get install -y curl wget git ufw

# Install jq for JSON parsing
apt-get install -y jq

# Create marker file
touch /root/.vultr-deployment-started

# The actual installation will be done after we SSH in
# This is just to prepare the system
SCRIPT_END
)

# Encode startup script in base64
STARTUP_SCRIPT_B64=$(echo "$STARTUP_SCRIPT" | base64 -w 0)

###############################################################################
# Step 7: Create VPS
###############################################################################

print_header "Step 7: Creating Vultr VPS..."

server_label="rv2class-$([ "$DEPLOY_JITSI" = true ] && echo "jitsi" || echo "coturn")-$(date +%Y%m%d)"

create_response=$(vultr_api POST "/instances" "{
    \"region\": \"$REGION\",
    \"plan\": \"$PLAN\",
    \"os_id\": $OS_ID,
    \"label\": \"$server_label\",
    \"sshkey_id\": [\"$SSH_KEY_ID\"],
    \"backups\": \"disabled\",
    \"enable_ipv6\": true,
    \"user_data\": \"$STARTUP_SCRIPT_B64\",
    \"hostname\": \"$([ "$DEPLOY_JITSI" = true ] && echo "$JITSI_DOMAIN" || echo "coturn.rv2class.com")\"
}")

INSTANCE_ID=$(echo "$create_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$INSTANCE_ID" ]; then
    print_error "Failed to create VPS. Response: $create_response"
    exit 1
fi

print_success "VPS created! Instance ID: $INSTANCE_ID"
print_status "Waiting for VPS to become active..."

# Wait for VPS to be ready
for i in {1..60}; do
    sleep 5
    instance_info=$(vultr_api GET "/instances/$INSTANCE_ID")
    status=$(echo "$instance_info" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ "$status" = "active" ]; then
        print_success "VPS is active!"
        break
    fi
    
    echo -n "."
    
    if [ $i -eq 60 ]; then
        print_error "Timeout waiting for VPS to become active"
        exit 1
    fi
done

# Get VPS IP
SERVER_IP=$(echo "$instance_info" | grep -o '"main_ip":"[^"]*"' | head -1 | cut -d'"' -f4)
print_success "VPS IP Address: $SERVER_IP"

# Save instance info
cat > /tmp/vultr-instance-info.json << EOF
{
    "instance_id": "$INSTANCE_ID",
    "ip": "$SERVER_IP",
    "region": "$REGION",
    "plan": "$PLAN",
    "label": "$server_label",
    "created": "$(date)",
    "deploy_jitsi": $DEPLOY_JITSI,
    "deploy_coturn": $DEPLOY_COTURN,
    "jitsi_domain": "${JITSI_DOMAIN:-none}"
}
EOF

print_success "Instance info saved to /tmp/vultr-instance-info.json"

###############################################################################
# Step 8: Wait for SSH
###############################################################################

print_header "Step 8: Waiting for SSH access..."

print_status "Waiting 30 seconds for system to boot..."
sleep 30

for i in {1..30}; do
    if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$SSH_KEY_PATH" root@$SERVER_IP "echo 'SSH Ready'" 2>/dev/null; then
        print_success "SSH is ready!"
        break
    fi
    echo -n "."
    sleep 5
    
    if [ $i -eq 30 ]; then
        print_error "Timeout waiting for SSH access"
        exit 1
    fi
done

###############################################################################
# Step 9: Upload and Run Installation Scripts
###############################################################################

print_header "Step 9: Installing software on VPS..."

if [ "$DEPLOY_COTURN" = true ]; then
    print_status "Installing Coturn..."
    
    # Upload Coturn script
    scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" \
        setup-coturn-vultr.sh root@$SERVER_IP:/root/
    
    # Run Coturn installation
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@$SERVER_IP << 'EOF_COTURN'
        cd /root
        chmod +x setup-coturn-vultr.sh
        ./setup-coturn-vultr.sh
EOF_COTURN
    
    print_success "Coturn installed!"
    
    # Fetch Coturn credentials
    print_status "Retrieving Coturn credentials..."
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@$SERVER_IP \
        "cat /root/coturn-credentials.txt" > /tmp/coturn-credentials.txt
    
    print_success "Coturn credentials saved to /tmp/coturn-credentials.txt"
fi

if [ "$DEPLOY_JITSI" = true ]; then
    print_status "Installing Jitsi Meet..."
    print_warning "This will take 5-10 minutes..."
    
    # First, update DNS warning
    echo ""
    print_warning "═══════════════════════════════════════════════════════════"
    print_warning "IMPORTANT: Update your DNS NOW!"
    print_warning "Add this A record:"
    print_warning "  $JITSI_DOMAIN  →  $SERVER_IP"
    print_warning "═══════════════════════════════════════════════════════════"
    echo ""
    read -p "Press Enter when DNS is updated (or to continue anyway)..."
    
    # Upload Jitsi script
    scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" \
        install-jitsi-vultr.sh root@$SERVER_IP:/root/
    
    # Run Jitsi installation with auto-answers
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@$SERVER_IP << EOF_JITSI
        cd /root
        chmod +x install-jitsi-vultr.sh
        
        # Run with auto-input
        echo "$JITSI_DOMAIN" | ./install-jitsi-vultr.sh <<ANSWERS
$JITSI_DOMAIN
$SSL_EMAIL
y
ANSWERS
EOF_JITSI
    
    print_success "Jitsi Meet installed!"
    
    # Fetch Jitsi info
    print_status "Retrieving Jitsi configuration..."
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@$SERVER_IP \
        "cat /root/jitsi-info.txt" > /tmp/jitsi-info.txt
    
    print_success "Jitsi info saved to /tmp/jitsi-info.txt"
fi

###############################################################################
# Step 10: Update Frontend Configuration
###############################################################################

print_header "Step 10: Generating frontend configuration..."

if [ "$DEPLOY_JITSI" = true ]; then
    cat > /tmp/jitsi-frontend-config.txt << EOF
╔═══════════════════════════════════════════════════════════╗
║           Frontend Update Instructions                    ║
╚═══════════════════════════════════════════════════════════╝

Update your JitsiRoom.tsx component:

1. Open: components/JitsiRoom.tsx

2. Change line ~70:
   FROM: const domain = "meet.jit.si";
   TO:   const domain = "$JITSI_DOMAIN";

3. If you have Coturn, add to configOverwrite (around line 77):
   p2p: {
     enabled: true,
     stunServers: [
       { urls: 'stun:$SERVER_IP:3478' }
     ],
     iceTransportPolicy: 'all'
   },

4. Deploy to Vercel:
   git add components/JitsiRoom.tsx
   git commit -m "Update to self-hosted Jitsi"
   git push

   (Vercel will auto-deploy)

5. Test your Jitsi:
   https://$JITSI_DOMAIN

═══════════════════════════════════════════════════════════
EOF
    
    print_success "Frontend config saved to /tmp/jitsi-frontend-config.txt"
fi

###############################################################################
# Final Summary
###############################################################################

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              Deployment Complete! 🎉                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

print_success "Your servers are ready!"
echo ""

if [ "$DEPLOY_COTURN" = true ]; then
    echo "═══ Coturn Server ═══"
    echo "  IP: $SERVER_IP"
    echo "  STUN: stun:$SERVER_IP:3478"
    echo "  TURN: turn:$SERVER_IP:3478"
    echo "  Credentials: /tmp/coturn-credentials.txt"
    echo ""
fi

if [ "$DEPLOY_JITSI" = true ]; then
    echo "═══ Jitsi Meet Server ═══"
    echo "  URL: https://$JITSI_DOMAIN"
    echo "  IP: $SERVER_IP"
    echo "  Info: /tmp/jitsi-info.txt"
    echo "  Frontend Config: /tmp/jitsi-frontend-config.txt"
    echo ""
fi

echo "═══ Server Access ═══"
echo "  SSH: ssh -i $SSH_KEY_PATH root@$SERVER_IP"
echo "  Instance ID: $INSTANCE_ID"
echo "  Region: $REGION"
echo "  Plan: $PLAN"
echo ""

echo "═══ Next Steps ═══"
if [ "$DEPLOY_JITSI" = true ]; then
    echo "  1. Verify DNS: $JITSI_DOMAIN → $SERVER_IP"
    echo "  2. Test Jitsi: https://$JITSI_DOMAIN"
    echo "  3. Update frontend (see /tmp/jitsi-frontend-config.txt)"
    echo "  4. Deploy to Vercel"
else
    echo "  1. Update frontend with Coturn server: $SERVER_IP"
    echo "  2. Deploy to Vercel"
fi
echo ""

echo "═══ View Credentials ═══"
[ "$DEPLOY_COTURN" = true ] && echo "  cat /tmp/coturn-credentials.txt"
[ "$DEPLOY_JITSI" = true ] && echo "  cat /tmp/jitsi-info.txt"
[ "$DEPLOY_JITSI" = true ] && echo "  cat /tmp/jitsi-frontend-config.txt"
echo ""

echo "═══ Cost ═══"
if [ "$DEPLOY_JITSI" = true ] && [ "$DEPLOY_COTURN" = true ]; then
    echo "  Monthly: ~$18 (Jitsi + Coturn combined)"
elif [ "$DEPLOY_JITSI" = true ]; then
    echo "  Monthly: ~$12 (Jitsi only)"
else
    echo "  Monthly: ~$6 (Coturn only)"
fi
echo ""

print_success "Deployment complete! 🚀"
echo ""

# Show how to view all info
echo "To view all deployment info:"
echo "  cat /tmp/vultr-instance-info.json"
echo ""
