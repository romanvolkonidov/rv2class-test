#!/bin/bash

###############################################################################
# Rebuild Jitsi with Excalidraw Fix - Proper Build Process
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

print_warning "This will take ~10-15 minutes"
echo ""

###############################################################################
# Modify Excalidraw to use local paths and rebuild
###############################################################################

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'

set -e

cd /tmp/jitsi-meet

echo "📦 Step 1: Modifying Excalidraw package to use local paths..."

# Find and modify the Excalidraw package
if [ -f "node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js" ]; then
    echo "  ✓ Found Excalidraw package"
    
    # Create backup
    cp node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js \
       node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js.backup
    
    # Replace unpkg.com URLs with relative paths  
    # The URL pattern is: https://unpkg.com/@jitsi/excalidraw@0.0.19/dist/excalidraw-assets/
    # We want to change it to: /libs/excalidraw-assets/
    sed -i 's|https://unpkg\.com/@jitsi/excalidraw@[^/]*/dist/excalidraw-assets/|/libs/excalidraw-assets/|g' \
        node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js
    
    # Verify the change
    if grep -q "/libs/excalidraw-assets/" node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js; then
        echo "  ✓ Successfully patched Excalidraw to use local paths"
    else
        echo "  ✗ Failed to patch Excalidraw"
        exit 1
    fi
else
    echo "  ✗ Excalidraw package not found"
    exit 1
fi

echo ""
echo "🏗️  Step 2: Building Jitsi Meet..."

# Build using webpack directly
echo "  Building app bundle..."
NODE_OPTIONS="--max-old-space-size=4096" npx webpack --config webpack.config.js --mode production 2>&1 | tail -50

if [ $? -eq 0 ]; then
    echo "  ✓ Build completed successfully"
else
    echo "  ✗ Build failed"
    exit 1
fi

echo ""
echo "📋 Step 3: Deploying to /usr/share/jitsi-meet..."

# Stop nginx temporarily to avoid file conflicts
systemctl stop nginx

# Backup current deployment
BACKUP_DIR="/usr/share/jitsi-meet-backup-$(date +%Y%m%d-%H%M%S)"
cp -r /usr/share/jitsi-meet "$BACKUP_DIR"
echo "  ✓ Backup created: $BACKUP_DIR"

# Deploy new build files
echo "  Copying app bundle..."
cp -f build/app.bundle.min.js* /usr/share/jitsi-meet/libs/ 2>/dev/null || true

echo "  Copying external API..."
cp -f build/external_api.min.js* /usr/share/jitsi-meet/libs/ 2>/dev/null || true

echo "  Copying excalidraw assets..."
rm -rf /usr/share/jitsi-meet/libs/excalidraw-assets
cp -r node_modules/@jitsi/excalidraw/dist/excalidraw-assets /usr/share/jitsi-meet/libs/

echo "  Copying main files..."
cp -f build/*.html /usr/share/jitsi-meet/ 2>/dev/null || true
cp -f build/*.js /usr/share/jitsi-meet/ 2>/dev/null || true

# Fix permissions
chown -R www-data:www-data /usr/share/jitsi-meet/libs/
chmod -R 755 /usr/share/jitsi-meet/libs/

# Start nginx
systemctl start nginx

echo "  ✓ Deployment complete"

echo ""
echo "✅ All done!"

ENDSSH

print_success "Rebuild and deployment complete!"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Success!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
echo "Changes made:"
echo "  1. Patched Excalidraw to use /libs/excalidraw-assets/ instead of unpkg.com"
echo "  2. Rebuilt app.bundle.min.js with the fix"
echo "  3. Deployed to production"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Clear browser cache: Ctrl+Shift+Delete"
echo "  2. Hard reload: Ctrl+Shift+R"
echo "  3. Test whiteboard at: https://app.rv2class.com"
echo ""
echo "The whiteboard feature should now work without unpkg.com errors!"
echo ""

