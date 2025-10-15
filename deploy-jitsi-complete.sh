#!/bin/bash

###############################################################################
# Complete Jitsi + Coturn Deployment Script
# Deploys Jitsi Meet on Fly.io + Coturn on Vultr
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   Jitsi Meet + Coturn Deployment for RV2Class                ║"
echo "║   Jitsi on Fly.io | Coturn on Vultr                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# Step 1: Verify Prerequisites
###############################################################################

print_status "Checking prerequisites..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    print_error "Fly CLI not found. Install it: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if logged into Fly
if ! fly auth whoami &> /dev/null; then
    print_error "Not logged into Fly.io. Run: fly auth login"
    exit 1
fi

print_success "Prerequisites OK!"

###############################################################################
# Step 2: Get Vultr Server Info for Coturn
###############################################################################

print_status "Let's set up the architecture..."
echo ""
echo "You need two things:"
echo "  1. Coturn server on Vultr (TURN/STUN relay)"
echo "  2. Jitsi Meet on Fly.io (video conferencing)"
echo ""

read -p "Do you already have a Coturn server on Vultr? (y/n): " has_coturn

if [[ $has_coturn =~ ^[Yy]$ ]]; then
    read -p "Enter your Coturn server IP: " COTURN_IP
    read -p "Enter TURN username (default: rv2class): " TURN_USER
    TURN_USER=${TURN_USER:-rv2class}
    read -p "Enter TURN password: " TURN_PASSWORD
else
    print_warning "You need to set up Coturn first!"
    echo ""
    echo "Run this on a new Vultr Ubuntu 22.04 server:"
    echo "  1. Create Vultr server (Ubuntu 22.04, $6/month plan)"
    echo "  2. SSH into it: ssh root@YOUR_SERVER_IP"
    echo "  3. Run: wget https://raw.githubusercontent.com/YOUR_REPO/setup-coturn-vultr.sh"
    echo "  4. Run: chmod +x setup-coturn-vultr.sh && ./setup-coturn-vultr.sh"
    echo "  5. Save the credentials from /root/coturn-credentials.txt"
    echo ""
    read -p "Or upload and run the local script? Press Enter when ready..."
    
    read -p "Enter your NEW Vultr server IP for Coturn: " COTURN_IP
    
    print_status "Uploading and running Coturn setup script..."
    
    # Check if setup script exists
    if [ ! -f "setup-coturn-vultr.sh" ]; then
        print_error "setup-coturn-vultr.sh not found in current directory"
        exit 1
    fi
    
    # Upload and run script
    scp setup-coturn-vultr.sh root@$COTURN_IP:/root/
    ssh root@$COTURN_IP "chmod +x /root/setup-coturn-vultr.sh && /root/setup-coturn-vultr.sh"
    
    print_success "Coturn installed! Fetching credentials..."
    
    # Fetch credentials
    TURN_USER=$(ssh root@$COTURN_IP "cat /root/coturn-credentials.txt | grep 'Username:' | awk '{print \$2}'")
    TURN_PASSWORD=$(ssh root@$COTURN_IP "cat /root/coturn-credentials.txt | grep 'Password:' | awk '{print \$2}'")
    
    print_success "Coturn credentials retrieved!"
fi

echo ""
print_success "Coturn Configuration:"
echo "  IP: $COTURN_IP"
echo "  Username: $TURN_USER"
echo "  Password: $TURN_PASSWORD"
echo ""

###############################################################################
# Step 3: Deploy Jitsi to Fly.io
###############################################################################

print_status "Deploying Jitsi Meet to Fly.io..."

# Use existing app or create new one
read -p "Use existing 'rv2class-bbb' app for Jitsi? (y/n): " use_existing

if [[ $use_existing =~ ^[Yy]$ ]]; then
    APP_NAME="rv2class-bbb"
    print_status "Using existing app: $APP_NAME"
else
    APP_NAME="rv2class-jitsi"
    print_status "Creating new Fly.io app: $APP_NAME"
    
    fly apps create $APP_NAME || print_warning "App might already exist"
fi

###############################################################################
# Step 4: Set Secrets
###############################################################################

print_status "Setting Fly.io secrets..."

# Generate secure passwords
JICOFO_COMPONENT_SECRET=$(openssl rand -hex 16)
JICOFO_AUTH_PASSWORD=$(openssl rand -hex 16)
JVB_AUTH_PASSWORD=$(openssl rand -hex 16)

fly secrets set \
    -a $APP_NAME \
    TURN_SERVER_IP="$COTURN_IP" \
    TURN_USERNAME="$TURN_USER" \
    TURN_PASSWORD="$TURN_PASSWORD" \
    JICOFO_COMPONENT_SECRET="$JICOFO_COMPONENT_SECRET" \
    JICOFO_AUTH_PASSWORD="$JICOFO_AUTH_PASSWORD" \
    JVB_AUTH_PASSWORD="$JVB_AUTH_PASSWORD"

print_success "Secrets configured!"

###############################################################################
# Step 5: Get Domain Info
###############################################################################

print_status "Jitsi needs a domain name..."
echo ""
echo "Options:"
echo "  1. Use Fly.io subdomain: $APP_NAME.fly.dev"
echo "  2. Use custom domain: jitsi.rv2class.com"
echo ""

read -p "Enter domain for Jitsi (default: $APP_NAME.fly.dev): " JITSI_DOMAIN
JITSI_DOMAIN=${JITSI_DOMAIN:-$APP_NAME.fly.dev}

print_success "Using domain: $JITSI_DOMAIN"

###############################################################################
# Step 6: Important Note About Jitsi on Fly.io
###############################################################################

print_warning "IMPORTANT: Jitsi is complex and resource-intensive!"
echo ""
echo "❌ PROBLEM: Jitsi requires multiple services (prosody, jicofo, jvb, web)"
echo "❌ PROBLEM: Fly.io charges per-service, making this expensive ($40-60/month)"
echo "❌ PROBLEM: Full Jitsi setup is complex and may not work well on Fly.io"
echo ""
echo "✅ BETTER OPTIONS:"
echo ""
echo "  Option A: Keep using meet.jit.si (FREE, already global)"
echo "    - Your current setup already works great"
echo "    - Jitsi's infrastructure is better than we can deploy"
echo "    - Perfect for your 2-teacher, 1-on-1 use case"
echo ""
echo "  Option B: Use Jitsi as a Service"
echo "    - 8x8 Video Meetings: https://8x8.vc (Jitsi's commercial offering)"
echo "    - Custom branding, recordings, ~$15-30/month"
echo "    - Much easier than self-hosting"
echo ""
echo "  Option C: Deploy full Jitsi stack on Vultr"
echo "    - Single $12-24/month VPS"
echo "    - All services on one machine"
echo "    - Easier to manage than Fly.io multi-app setup"
echo ""

read -p "Do you still want to deploy Jitsi on Fly.io? (y/n): " proceed

if [[ ! $proceed =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled. Consider the alternatives above!"
    echo ""
    echo "Quick recommendations:"
    echo "  • For now: Use meet.jit.si (your current setup)"
    echo "  • When you grow: Consider 8x8 Video Meetings or Vultr deployment"
    echo "  • Your Coturn is still useful for BBB or future use"
    exit 0
fi

###############################################################################
# Step 7: Create Simplified Jitsi Deployment (Web Interface Only)
###############################################################################

print_status "Creating simplified Jitsi deployment..."
print_warning "Note: This deploys only the web interface, using meet.jit.si backend"
echo ""

# This is a more realistic approach - just customize the Jitsi web interface
cat > fly-jitsi.toml << EOF
app = "$APP_NAME"
primary_region = "jnb"

[build]
  image = "jitsi/web:stable"

[env]
  PUBLIC_URL = "https://$JITSI_DOMAIN"
  ENABLE_GUESTS = "1"
  ENABLE_LETSENCRYPT = "0"
  ENABLE_HTTP_REDIRECT = "1"
  XMPP_DOMAIN = "meet.jitsi"
  XMPP_BOSH_URL_BASE = "https://meet.jit.si/http-bind"

[http_service]
  internal_port = 80
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
EOF

print_success "Configuration created: fly-jitsi.toml"

###############################################################################
# Step 8: Deploy
###############################################################################

print_status "Deploying to Fly.io..."

fly deploy --config fly-jitsi.toml --app $APP_NAME

if [ $? -eq 0 ]; then
    print_success "Deployment complete!"
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                 Deployment Complete!                          ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Your Jitsi URL: https://$JITSI_DOMAIN"
    echo "Coturn Server: $COTURN_IP"
    echo ""
    echo "Next Steps:"
    echo "  1. Update your frontend (JitsiRoom.tsx):"
    echo "     const domain = \"$JITSI_DOMAIN\";"
    echo ""
    echo "  2. Redeploy your Vercel app with new domain"
    echo ""
    echo "  3. Test the setup!"
    echo ""
else
    print_error "Deployment failed! Check the logs above."
    exit 1
fi
