#!/bin/bash

# ============================================
# Deploy Frontend to Existing Vultr Server
# Adds Next.js app to your Jitsi server
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="207.246.95.30"
SERVER_PASSWORD="eG7[89B2tgdJM=t2"
GITHUB_REPO="romanvolkonidov/rv2class-test"
DOMAIN="app.rv2class.com"  # Test domain (switch to online.rv2class.com when ready)
EMAIL="romanvolkonidov@gmail.com"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Deploy RV2Class Frontend to Existing Vultr Server       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Configuration:${NC}"
echo "  Server: ${YELLOW}$SERVER_IP${NC}"
echo "  Domain: ${YELLOW}$DOMAIN${NC}"
echo "  Email: ${YELLOW}$EMAIL${NC}"
echo ""
echo -e "${YELLOW}This will install on your EXISTING server with Jitsi${NC}"
echo ""
echo -e "${RED}IMPORTANT: Add this DNS record first:${NC}"
echo -e "${GREEN}  Type:  A${NC}"
echo -e "${GREEN}  Name:  app.rv2class.com${NC}"
echo -e "${GREEN}  Value: $SERVER_IP${NC}"
echo ""
echo -e "${YELLOW}This is your TEST domain. Students keep using online.rv2class.com${NC}"
echo ""
read -p "Have you added the DNS record? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please add the DNS record first, then run this script again."
    exit 1
fi

# Install sshpass if needed
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    sudo apt-get update -qq
    sudo apt-get install -y sshpass
fi

echo ""
echo -e "${YELLOW}Deploying to server...${NC}"
echo ""

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP bash << ENDSSH
set -e

echo "=== Installing Frontend Application ==="

# Install Node.js 20 if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "✓ Node.js already installed: \$(node --version)"
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
else
    echo "✓ PM2 already installed"
fi

# Install git if not present
if ! command -v git &> /dev/null; then
    apt-get install -y git
fi

# Clone or update repository
if [ -d "/var/www/rv2class" ]; then
    echo "Updating existing repository..."
    cd /var/www/rv2class
    git fetch origin
    git reset --hard origin/main
else
    echo "Cloning repository..."
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/$GITHUB_REPO.git rv2class
    cd rv2class
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build Next.js app
echo "Building Next.js application..."
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'rv2class',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/rv2class',
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

# Stop if already running
pm2 delete rv2class 2>/dev/null || true

# Start with PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
env PATH=\$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# Configure Nginx for frontend
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/rv2class << 'NGINX_EOF'
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
NGINX_EOF

# Enable site
ln -sf /etc/nginx/sites-available/rv2class /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Get SSL certificate
echo "Getting SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

echo ""
echo "=== Installation Complete! ==="
echo ""
pm2 list
echo ""

ENDSSH

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Frontend Deployed Successfully!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Your app is live at:${NC}"
echo -e "${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}What's running on this server:${NC}"
echo "  ✓ Jitsi Meet (video conferencing)"
echo "  ✓ RV2Class Frontend (Next.js app)"
echo "  ✓ Coturn (TURN/STUN server)"
echo ""
echo -e "${YELLOW}Domains:${NC}"
echo "  • jitsi.rv2class.com → Jitsi (video)"
echo "  • app.rv2class.com → Your Frontend (TEST)"
echo "  • online.rv2class.com → (still points to old server - safe!)"
echo ""
echo -e "${GREEN}After testing, you can switch online.rv2class.com DNS${NC}"
echo "  to point to $SERVER_IP to go live!"
echo ""
echo -e "${YELLOW}Next Step: Setup GitHub Actions${NC}"
echo "Run: ${GREEN}./setup-github-actions.sh${NC}"
echo ""
