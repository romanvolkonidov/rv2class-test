#!/bin/bash

# ============================================
# Complete Frontend Deployment to Vultr
# Deploys Next.js app with Nginx + SSL
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VULTR_API_KEY="W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A"
GITHUB_REPO="romanvolkonidov/rv2class-test"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Deploy RV2Class Frontend to Vultr                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Get domain configuration
echo -e "${YELLOW}Step 1: Domain Configuration${NC}"
echo ""
echo "Your options:"
echo "  1. app.rv2class.com (recommended - keeps current prod safe)"
echo "  2. rv2class.com (replaces current production)"
echo "  3. Custom domain"
echo ""
read -p "Choose option (1/2/3): " DOMAIN_CHOICE

case $DOMAIN_CHOICE in
    1)
        DOMAIN="app.rv2class.com"
        ;;
    2)
        DOMAIN="rv2class.com"
        echo -e "${RED}WARNING: This will replace your current production!${NC}"
        read -p "Are you sure? (yes/no): " CONFIRM
        if [[ "$CONFIRM" != "yes" ]]; then
            echo "Cancelled."
            exit 1
        fi
        ;;
    3)
        read -p "Enter your domain: " DOMAIN
        ;;
    *)
        DOMAIN="app.rv2class.com"
        ;;
esac

read -p "Enter your email for SSL (e.g., romanvolkonidov@gmail.com): " EMAIL

echo ""
echo -e "${GREEN}Configuration:${NC}"
echo "  Domain: ${YELLOW}$DOMAIN${NC}"
echo "  Email: ${YELLOW}$EMAIL${NC}"
echo ""

# Step 2: Create Vultr server
echo -e "${YELLOW}Step 2: Creating Vultr Server${NC}"
echo ""
echo "Server specs:"
echo "  • Ubuntu 22.04"
echo "  • 2GB RAM, 1 vCPU"
echo "  • Region: New York (ewr)"
echo "  • Cost: ~$12/month"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Create server
echo "Creating server..."
CREATE_RESPONSE=$(curl -s -X POST "https://api.vultr.com/v2/instances" \
  -H "Authorization: Bearer $VULTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"region\": \"ewr\",
    \"plan\": \"vc2-1c-2gb\",
    \"os_id\": 1743,
    \"label\": \"rv2class-frontend\",
    \"hostname\": \"rv2class-app\",
    \"enable_ipv6\": false,
    \"backups\": \"disabled\",
    \"ddos_protection\": false,
    \"activation_email\": false
  }")

INSTANCE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$INSTANCE_ID" ]; then
    echo -e "${RED}Failed to create server!${NC}"
    echo "$CREATE_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓${NC} Server created! ID: $INSTANCE_ID"
echo "Waiting for server to be ready (this takes ~60 seconds)..."

# Wait for server to be active
for i in {1..30}; do
    sleep 5
    STATUS=$(curl -s "https://api.vultr.com/v2/instances/$INSTANCE_ID" \
      -H "Authorization: Bearer $VULTR_API_KEY" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ "$STATUS" = "active" ]; then
        echo -e "${GREEN}✓${NC} Server is active!"
        break
    fi
    echo -n "."
done

# Get server IP and password
SERVER_INFO=$(curl -s "https://api.vultr.com/v2/instances/$INSTANCE_ID" \
  -H "Authorization: Bearer $VULTR_API_KEY")

SERVER_IP=$(echo "$SERVER_INFO" | grep -o '"main_ip":"[^"]*"' | head -1 | cut -d'"' -f4)
DEFAULT_PASSWORD=$(echo "$SERVER_INFO" | grep -o '"default_password":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Server Created Successfully!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Server IP:${NC} $SERVER_IP"
echo -e "${BLUE}Password:${NC} $DEFAULT_PASSWORD"
echo ""
echo -e "${YELLOW}IMPORTANT DNS SETUP:${NC}"
echo "Add this DNS record to your domain:"
echo ""
echo -e "${GREEN}  Type:  A${NC}"
echo -e "${GREEN}  Name:  ${DOMAIN}${NC}"
echo -e "${GREEN}  Value: ${SERVER_IP}${NC}"
echo -e "${GREEN}  TTL:   300 (or Auto)${NC}"
echo ""
echo "Go to your DNS provider (Cloudflare, Namecheap, etc.) and add this record."
echo ""
read -p "Press Enter after you've added the DNS record..."

# Step 3: Wait for SSH to be ready
echo ""
echo -e "${YELLOW}Step 3: Waiting for SSH...${NC}"

# Install sshpass
if ! command -v sshpass &> /dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y sshpass
fi

for i in {1..30}; do
    sleep 5
    if sshpass -p "$DEFAULT_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@$SERVER_IP "echo 'SSH Ready'" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} SSH is ready!"
        break
    fi
    echo -n "."
done

# Step 4: Deploy application
echo ""
echo -e "${YELLOW}Step 4: Installing and Configuring Application${NC}"
echo "This will take 5-10 minutes..."
echo ""

sshpass -p "$DEFAULT_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP bash << ENDSSH
set -e

echo "=== Setting up server ==="

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

# Install Node.js 20
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install other dependencies
echo "Installing dependencies..."
apt-get install -y nginx certbot python3-certbot-nginx git build-essential

# Install PM2
npm install -g pm2

# Clone repository
echo "Cloning repository..."
cd /var/www
git clone https://github.com/$GITHUB_REPO.git rv2class
cd rv2class

# Install dependencies
echo "Installing Node packages..."
npm install

# Build Next.js app
echo "Building Next.js app..."
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'rv2class',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

# Start with PM2
echo "Starting application..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Configure Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/rv2class << 'NGINX_EOF'
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_EOF

# Enable site
ln -sf /etc/nginx/sites-available/rv2class /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Get SSL certificate
echo "Getting SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

# Setup auto-renewal
systemctl enable certbot.timer

echo ""
echo "=== Installation Complete! ==="
pm2 list

ENDSSH

# Step 5: Save configuration
echo ""
echo -e "${YELLOW}Step 5: Saving Configuration${NC}"

cat > server-info.txt << EOF
RV2Class Vultr Deployment
=========================
Created: $(date)

Server Details:
- IP Address: $SERVER_IP
- Domain: $DOMAIN
- Instance ID: $INSTANCE_ID
- Root Password: $DEFAULT_PASSWORD

Access:
- Website: https://$DOMAIN
- SSH: ssh root@$SERVER_IP
- Password: $DEFAULT_PASSWORD

Management:
- View logs: ssh root@$SERVER_IP 'pm2 logs'
- Restart app: ssh root@$SERVER_IP 'pm2 restart rv2class'
- Update code: Run ./deploy-to-production.sh

Vultr Dashboard:
https://my.vultr.com/

IMPORTANT:
- Snapshot created in Vultr dashboard for backup
- DNS: $DOMAIN -> $SERVER_IP
- SSL auto-renews via Let's Encrypt
EOF

echo -e "${GREEN}✓${NC} Configuration saved to server-info.txt"

# Update deployment script with new server
sed -i "s/SERVER_IP=\"207.246.95.30\"/SERVER_IP=\"$SERVER_IP\"/" deploy-to-production.sh
sed -i "s/SERVER_PASSWORD=\"eG7\[89B2tgdJM=t2\"/SERVER_PASSWORD=\"$DEFAULT_PASSWORD\"/" deploy-to-production.sh

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         🎉 DEPLOYMENT COMPLETE! 🎉                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Your app is live at:${NC}"
echo -e "${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}What's been set up:${NC}"
echo "  ✓ Ubuntu 22.04 server"
echo "  ✓ Node.js 20 + Next.js app"
echo "  ✓ Nginx reverse proxy"
echo "  ✓ SSL certificate (auto-renewing)"
echo "  ✓ PM2 process manager"
echo "  ✓ Auto-restart on crash"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Test your app: ${GREEN}https://$DOMAIN${NC}"
echo ""
echo "2. Create snapshot in Vultr:"
echo "   https://my.vultr.com/"
echo "   Click on 'rv2class-frontend' → Snapshots → Take Snapshot"
echo ""
echo "3. To deploy updates:"
echo "   ${GREEN}./deploy-to-production.sh${NC}"
echo ""
echo "4. To set up automatic nightly deployment:"
echo "   ${GREEN}./setup-auto-deploy.sh${NC}"
echo ""
echo -e "${YELLOW}Server Access:${NC}"
echo "  SSH: ${GREEN}ssh root@$SERVER_IP${NC}"
echo "  Password: ${GREEN}$DEFAULT_PASSWORD${NC}"
echo "  Logs: ${GREEN}ssh root@$SERVER_IP 'pm2 logs'${NC}"
echo ""
echo "All details saved in: ${GREEN}server-info.txt${NC}"
echo ""
