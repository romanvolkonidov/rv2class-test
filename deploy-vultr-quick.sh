#!/bin/bash

# Quick Vultr Deployment Script with Pre-filled Values
# Auto-deploys Jitsi + Coturn to Vultr with your settings

set -e

# ============================================
# PRE-CONFIGURED VALUES
# ============================================
VULTR_API_KEY="W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A"
DEPLOYMENT_TYPE="both"  # both/coturn/jitsi
JITSI_DOMAIN="jitsi.rv2class.com"
EMAIL="romanvolkonidov@gmail.com"
REGION="ewr"  # New York/New Jersey
PLAN="vc2-1c-2gb"  # $12/month - 1 CPU, 2GB RAM

# ============================================
# Colors
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Quick Vultr Deployment - Jitsi + Coturn                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Configuration:${NC}"
echo -e "  Domain: ${YELLOW}${JITSI_DOMAIN}${NC}"
echo -e "  Email: ${YELLOW}${EMAIL}${NC}"
echo -e "  Region: ${YELLOW}New York (ewr)${NC}"
echo -e "  Plan: ${YELLOW}$12/month (1 CPU, 2GB RAM)${NC}"
echo ""
echo -e "${YELLOW}This will:${NC}"
echo "  1. Create a new Vultr VPS ($12/month)"
echo "  2. Install Jitsi Meet + Coturn"
echo "  3. Configure SSL with Let's Encrypt"
echo "  4. Generate credentials"
echo ""
echo -e "${RED}Total cost: ~$12/month${NC}"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# ============================================
# Create VPS
# ============================================
echo -e "\n${BLUE}[1/5] Creating Vultr VPS...${NC}"

RESPONSE=$(curl -s "https://api.vultr.com/v2/instances" \
  -X POST \
  -H "Authorization: Bearer ${VULTR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"region\": \"${REGION}\",
    \"plan\": \"${PLAN}\",
    \"os_id\": 1743,
    \"label\": \"jitsi-coturn-rv2class\",
    \"hostname\": \"${JITSI_DOMAIN}\",
    \"enable_ipv6\": false,
    \"backups\": \"disabled\",
    \"ddos_protection\": false
  }")

INSTANCE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$INSTANCE_ID" ]; then
    echo -e "${RED}Failed to create instance!${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ VPS created: ${INSTANCE_ID}${NC}"

# ============================================
# Wait for VPS to be active
# ============================================
echo -e "\n${BLUE}[2/5] Waiting for VPS to boot (2-3 minutes)...${NC}"

for i in {1..60}; do
    INSTANCE_INFO=$(curl -s "https://api.vultr.com/v2/instances/${INSTANCE_ID}" \
      -H "Authorization: Bearer ${VULTR_API_KEY}")
    STATUS=$(echo $INSTANCE_INFO | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ "$STATUS" = "active" ]; then
        echo -e "${GREEN}✓ VPS is active!${NC}"
        break
    fi
    
    echo -n "."
    sleep 5
done

if [ "$STATUS" != "active" ]; then
    echo -e "${RED}VPS failed to boot!${NC}"
    exit 1
fi

# Get IP address and password
INSTANCE_DETAILS=$(curl -s "https://api.vultr.com/v2/instances/${INSTANCE_ID}" \
  -H "Authorization: Bearer ${VULTR_API_KEY}")

SERVER_IP=$(echo $INSTANCE_DETAILS | grep -o '"main_ip":"[^"]*' | head -1 | cut -d'"' -f4)
ROOT_PASSWORD=$(echo $INSTANCE_DETAILS | grep -o '"default_password":"[^"]*' | head -1 | cut -d'"' -f4)

echo -e "${GREEN}✓ Server IP: ${SERVER_IP}${NC}"
echo -e "${GREEN}✓ Root Password: ${ROOT_PASSWORD}${NC}"

# ============================================
# Wait for SSH to be ready
# ============================================
echo -e "\n${BLUE}[3/5] Waiting for SSH to be ready (1-2 minutes)...${NC}"

# Install sshpass if not available
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    sudo apt-get update && sudo apt-get install -y sshpass 2>/dev/null || true
fi

for i in {1..40}; do
    if sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@${SERVER_IP} "echo 'SSH ready'" &>/dev/null; then
        echo -e "${GREEN}✓ SSH is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 5
done

# ============================================
# Install Software
# ============================================
echo -e "\n${BLUE}[4/5] Installing Jitsi + Coturn (5-10 minutes)...${NC}"

sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} bash <<'ENDSSH'
set -e

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# ============================================
# Install Jitsi Meet
# ============================================
echo "Installing Jitsi Meet..."

# Set hostname
hostnamectl set-hostname JITSI_DOMAIN_PLACEHOLDER

# Add Jitsi repository
curl -sL https://download.jitsi.org/jitsi-key.gpg.key | apt-key add -
echo "deb https://download.jitsi.org stable/" > /etc/apt/sources.list.d/jitsi-stable.list
apt-get update

# Pre-configure for unattended install
echo "jitsi-videobridge jitsi-videobridge/jvb-hostname string JITSI_DOMAIN_PLACEHOLDER" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate" | debconf-set-selections

# Install Jitsi
apt-get install -y jitsi-meet

# Setup Let's Encrypt SSL
/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh <<EOF
EMAIL_PLACEHOLDER
EOF

# ============================================
# Install Coturn
# ============================================
echo "Installing Coturn..."

apt-get install -y coturn

# Generate random credentials
TURN_SECRET=$(openssl rand -hex 32)
TURN_USER="rv2class"
TURN_PASSWORD=$(openssl rand -base64 24)

# Configure Coturn
cat > /etc/turnserver.conf <<COTURNEOF
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=\$(hostname -I | awk '{print \$1}')
external-ip=\$(curl -s ifconfig.me)
realm=JITSI_DOMAIN_PLACEHOLDER
server-name=JITSI_DOMAIN_PLACEHOLDER
lt-cred-mech
user=\${TURN_USER}:\${TURN_PASSWORD}
use-auth-secret
static-auth-secret=\${TURN_SECRET}
cert=/etc/letsencrypt/live/JITSI_DOMAIN_PLACEHOLDER/fullchain.pem
pkey=/etc/letsencrypt/live/JITSI_DOMAIN_PLACEHOLDER/privkey.pem
cipher-list="ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384"
no-stdout-log
log-file=/var/log/turnserver.log
simple-log
verbose
fingerprint
COTURNEOF

# Enable and start Coturn
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
systemctl enable coturn
systemctl restart coturn

# Configure Jitsi to use Coturn
cat >> /etc/jitsi/meet/JITSI_DOMAIN_PLACEHOLDER-config.js <<JITSIEOF

// TURN/STUN Configuration
p2p: {
    enabled: true,
    stunServers: [
        { urls: 'stun:JITSI_DOMAIN_PLACEHOLDER:3478' },
        { urls: 'stun:stun.l.google.com:19302' }
    ]
},
JITSIEOF

# Save credentials
cat > /root/credentials.txt <<CREDEOF
╔════════════════════════════════════════════════════════════╗
║           Jitsi + Coturn Credentials                       ║
╚════════════════════════════════════════════════════════════╝

Jitsi Meet URL:
  https://JITSI_DOMAIN_PLACEHOLDER

Coturn STUN/TURN:
  STUN: stun:JITSI_DOMAIN_PLACEHOLDER:3478
  TURN: turn:JITSI_DOMAIN_PLACEHOLDER:3478
  
  Username: ${TURN_USER}
  Password: ${TURN_PASSWORD}
  Secret: ${TURN_SECRET}

Next Steps:
  1. Add DNS A record:
     jitsi.rv2class.com → \$(curl -s ifconfig.me)
  
  2. Update frontend JitsiRoom.tsx:
     domain: 'JITSI_DOMAIN_PLACEHOLDER'
  
  3. Deploy to Vercel:
     git add .
     git commit -m "Switch to self-hosted Jitsi"
     git push

Server IP: \$(curl -s ifconfig.me)
CREDEOF

chmod 600 /root/credentials.txt

echo "Installation complete!"
cat /root/credentials.txt

ENDSSH

# Replace placeholders in SSH commands
sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} "sed -i 's/JITSI_DOMAIN_PLACEHOLDER/${JITSI_DOMAIN}/g' /etc/turnserver.conf /etc/jitsi/meet/*-config.js /root/credentials.txt"
sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} "sed -i 's/EMAIL_PLACEHOLDER/${EMAIL}/g' /root/credentials.txt"

# ============================================
# Retrieve and display credentials
# ============================================
echo -e "\n${BLUE}[5/5] Deployment Complete!${NC}\n"

sshpass -p "${ROOT_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${SERVER_IP} "cat /root/credentials.txt"

echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Credentials saved to: ${SERVER_IP}:/root/credentials.txt${NC}"
echo -e "${GREEN}Root Password: ${ROOT_PASSWORD}${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}IMPORTANT - DNS Configuration:${NC}"
echo -e "Add this A record to your DNS:"
echo -e "  ${BLUE}jitsi.rv2class.com${NC} → ${GREEN}${SERVER_IP}${NC}"
echo ""
echo -e "${YELLOW}After DNS propagates (5-10 minutes):${NC}"
echo -e "  1. Test: ${BLUE}https://jitsi.rv2class.com${NC}"
echo -e "  2. Update JitsiRoom.tsx with domain: '${JITSI_DOMAIN}'"
echo -e "  3. Deploy frontend to Vercel"
echo ""
