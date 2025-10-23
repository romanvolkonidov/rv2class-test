#!/bin/bash

###############################################################################
# Deploy Custom RV2Class Frontend with TeacherAuthPage
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

SERVER_IP="108.61.245.179"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  Deploying Custom RV2Class Frontend${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

###############################################################################
# Step 1: Build locally
###############################################################################

print_status "Building Jitsi Meet with custom RV2Class components..."

cd jitsi-custom/jitsi-meet

if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm ci --legacy-peer-deps
fi

print_status "Running webpack build..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

print_success "Build complete!"

###############################################################################
# Step 2: Deploy to server
###############################################################################

print_status "Deploying to server..."

# Stop nginx temporarily
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP 'systemctl stop nginx'

# Backup current deployment
print_status "Creating backup..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP \
    "cp -r /usr/share/jitsi-meet /usr/share/jitsi-meet-backup-\$(date +%Y%m%d-%H%M%S)"

# Deploy libs (app.bundle.min.js, etc.)
print_status "Uploading libs..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no \
    libs/* root@$SERVER_IP:/usr/share/jitsi-meet/libs/

# Deploy CSS
print_status "Uploading CSS..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no \
    css/* root@$SERVER_IP:/usr/share/jitsi-meet/css/

# Deploy images
print_status "Uploading images..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no \
    images/* root@$SERVER_IP:/usr/share/jitsi-meet/images/

# Deploy sounds
print_status "Uploading sounds..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no \
    sounds/* root@$SERVER_IP:/usr/share/jitsi-meet/sounds/ 2>/dev/null || true

# Deploy lang
print_status "Uploading lang files..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no \
    lang/* root@$SERVER_IP:/usr/share/jitsi-meet/lang/

# Fix permissions
print_status "Fixing permissions..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP \
    'chown -R www-data:www-data /usr/share/jitsi-meet && chmod -R 755 /usr/share/jitsi-meet'

# Start nginx
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP 'systemctl start nginx'

print_success "Deployment complete!"

###############################################################################
# Step 3: Verify
###############################################################################

print_status "Verifying deployment..."

echo ""
echo "App bundle:"
curl -sI https://app.rv2class.com/libs/app.bundle.min.js | grep -E "HTTP|Last-Modified"

echo ""
print_success "✅ Custom frontend deployed successfully!"
echo ""
echo "Clear your browser cache and test: https://app.rv2class.com/"
echo ""

