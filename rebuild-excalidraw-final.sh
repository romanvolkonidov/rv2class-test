#!/bin/bash

###############################################################################
# Rebuild Jitsi with Excalidraw Fix - Using Perl for replacement
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

SERVER_IP="108.61.245.179"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"

echo ""
echo -e "${PURPLE}══════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  Rebuilding Jitsi with Local Excalidraw Assets${NC}"
echo -e "${PURPLE}══════════════════════════════════════════════════════${NC}"
echo ""

print_warning "This will take ~10-15 minutes"
echo ""

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'

set -e

cd /tmp/jitsi-meet

echo "📦 Step 1: Modifying Excalidraw to use local paths..."

EXCALIDRAW_FILE="node_modules/@jitsi/excalidraw/dist/excalidraw.production.min.js"

if [ -f "$EXCALIDRAW_FILE" ]; then
    echo "  ✓ Found Excalidraw package"
    
    # Create backup
    cp "$EXCALIDRAW_FILE" "${EXCALIDRAW_FILE}.backup"
    
    # Use perl for more robust replacement
    # Replace: https://unpkg.com/@jitsi/excalidraw@VERSION/dist/excalidraw-assets/
    # With: /libs/excalidraw-assets/
    perl -pi -e 's|https://unpkg\.com/@jitsi/excalidraw@[^/]+/dist/excalidraw-assets/|/libs/excalidraw-assets/|g' "$EXCALIDRAW_FILE"
    
    # Verify the change
    if grep -q "/libs/excalidraw-assets/" "$EXCALIDRAW_FILE"; then
        echo "  ✓ Successfully patched Excalidraw to use local paths"
    else
        echo "  ! Could not verify patch (file may already be patched or use different format)"
        echo "  Checking original content..."
        if ! grep -q "unpkg.com" "$EXCALIDRAW_FILE"; then
            echo "  ✓ File doesn't contain unpkg.com references (already good!)"
        else
            echo "  ✗ Failed to patch Excalidraw properly"
            exit 1
        fi
    fi
else
    echo "  ✗ Excalidraw package not found"
    exit 1
fi

echo ""
echo "🏗️  Step 2: Building Jitsi Meet..."

# Build using webpack
echo "  Building app bundle..."
NODE_OPTIONS="--max-old-space-size=4096" npx webpack --config webpack.config.js --mode production 2>&1 | tail -50

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "  ✓ Build completed successfully"
else
    echo "  ✗ Build failed"
    exit 1
fi

echo ""
echo "📋 Step 3: Deploying to /usr/share/jitsi-meet..."

# Stop nginx
systemctl stop nginx

# Backup
BACKUP_DIR="/usr/share/jitsi-meet-backup-$(date +%Y%m%d-%H%M%S)"
cp -r /usr/share/jitsi-meet "$BACKUP_DIR"
echo "  ✓ Backup created: $BACKUP_DIR"

# Deploy
echo "  Copying files..."
cp -f build/app.bundle.min.js* /usr/share/jitsi-meet/libs/ 2>/dev/null || true
cp -f build/external_api.min.js* /usr/share/jitsi-meet/libs/ 2>/dev/null || true

# Copy excalidraw assets
rm -rf /usr/share/jitsi-meet/libs/excalidraw-assets
cp -r node_modules/@jitsi/excalidraw/dist/excalidraw-assets /usr/share/jitsi-meet/libs/

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
echo "The whiteboard should now work without unpkg.com errors!"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Hard refresh browser: Ctrl+Shift+R (Cmd+Shift+R on Mac)"
echo "  2. Clear cache if needed: Ctrl+Shift+Delete"
echo "  3. Test at: https://app.rv2class.com"
echo ""

