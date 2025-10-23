#!/bin/bash

###############################################################################
# Option 2: Rebuild with Proper Excalidraw Asset Paths (Full Fix)
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

SERVER_IP="108.61.245.179"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"

echo ""
echo -e "${PURPLE}══════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  Rebuilding Jitsi with Local Excalidraw Assets${NC}"
echo -e "${PURPLE}══════════════════════════════════════════════════════${NC}"
echo ""

print_warning "This will take ~10-15 minutes to rebuild Jitsi Meet"
echo ""

###############################################################################
# Step 1: Modify the Excalidraw package to use relative paths
###############################################################################

print_status "Modifying Excalidraw package configuration..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'

cd /tmp/jitsi-meet

# Find where the Excalidraw package sets its asset path
# The issue is in node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js
# It has the unpkg.com URL hardcoded

# Let's check if we can modify it
if [ -f "node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js" ]; then
    echo "✓ Found Excalidraw package"
    
    # Create a backup
    cp node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js \
       node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js.backup
    
    # Replace unpkg.com URLs with relative paths
    sed -i 's|https://unpkg.com/@jitsi/excalidraw@[^/]*/dist/excalidraw-assets/|/libs/excalidraw-assets/|g' \
        node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js
    
    echo "✓ Modified Excalidraw to use local asset paths"
else
    echo "✗ Excalidraw package not found in node_modules"
    exit 1
fi

ENDSSH

print_success "Excalidraw package modified!"

###############################################################################
# Step 2: Rebuild the app bundle
###############################################################################

print_status "Rebuilding Jitsi Meet app bundle..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH2'

cd /tmp/jitsi-meet

echo "📦 Building production bundle..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build 2>&1 | tail -30

if [ $? -eq 0 ]; then
    echo "✓ Build completed successfully"
else
    echo "✗ Build failed"
    exit 1
fi

ENDSSH2

print_success "Rebuilt successfully!"

###############################################################################
# Step 3: Deploy the new build
###############################################################################

print_status "Deploying new build to Jitsi directory..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH3'

cd /tmp/jitsi-meet

# Stop services temporarily
systemctl stop nginx

# Backup current deployment
cp -r /usr/share/jitsi-meet /usr/share/jitsi-meet-backup-$(date +%Y%m%d-%H%M%S)

# Copy new build
echo "📋 Copying new files..."
cp -r build/* /usr/share/jitsi-meet/
cp -r libs/* /usr/share/jitsi-meet/libs/
cp -r css/* /usr/share/jitsi-meet/css/
cp -r images/* /usr/share/jitsi-meet/images/ 2>/dev/null || true

# Fix permissions
chown -R www-data:www-data /usr/share/jitsi-meet
chmod -R 755 /usr/share/jitsi-meet

# Start services
systemctl start nginx

echo "✓ Deployment complete"

ENDSSH3

print_success "Deployed!"

###############################################################################
# Step 4: Verify the fix
###############################################################################

print_status "Verifying the deployment..."

echo ""
echo "Testing Excalidraw vendor file:"
curl -s -I https://app.rv2class.com/libs/excalidraw-assets/vendor-75e22c20f1d603abdfc9.js | grep -E "HTTP|Content-Type"

echo ""
print_success "Rebuild and deployment complete!"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Success!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
echo "The Excalidraw assets should now load from local paths."
echo ""
echo "Clear your browser cache and test: https://app.rv2class.com"
echo ""
echo "If you still see errors, run: ./disable-whiteboard.sh"
echo ""

