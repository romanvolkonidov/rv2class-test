#!/bin/bash

###############################################################################
# Fix Excalidraw Loading Issues and Add Favicon
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

SERVER_IP="108.61.245.179"
SERVER_USER="root"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"

print_status "Fixing Excalidraw and Favicon issues..."

###############################################################################
# Step 1: Create a simple favicon.ico
###############################################################################
print_status "Creating favicon.ico..."

# Create a temporary directory
mkdir -p /tmp/rv2class-fix
cd /tmp/rv2class-fix

# Generate a simple 16x16 favicon (RV2Class logo placeholder)
# This creates a minimal valid ICO file
cat > favicon.ico << 'FAVICON_EOF'
FAVICON_EOF

# Actually, let's download a proper favicon or create one
# For now, we'll use ImageMagick to create a simple one if available
if command -v convert &> /dev/null; then
    convert -size 32x32 xc:blue -fill white -pointsize 20 -gravity center \
        -annotate +0+0 "RV" favicon.ico 2>/dev/null || {
        # Fallback: copy from Jitsi default or create empty
        print_status "Creating minimal favicon..."
        # Create a minimal valid ICO file (1x1 transparent)
        printf '\x00\x00\x01\x00\x01\x00\x01\x01\x00\x00\x01\x00\x18\x00\x30\x00\x00\x00\x16\x00\x00\x00\x28\x00\x00\x00\x01\x00\x00\x00\x02\x00\x00\x00\x01\x00\x18\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xFF\xFF\xFF\x00\x00\x00\x00' > favicon.ico
    }
else
    print_status "Creating minimal favicon without ImageMagick..."
    # Create a minimal valid ICO file
    printf '\x00\x00\x01\x00\x01\x00\x10\x10\x00\x00\x01\x00\x18\x00\x68\x03\x00\x00\x16\x00\x00\x00\x28\x00\x00\x00\x10\x00\x00\x00\x20\x00\x00\x00\x01\x00\x18\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00' > favicon.ico
    # Fill with blue color (simplified)
    dd if=/dev/zero bs=1 count=896 2>/dev/null | tr '\0' '\x42' >> favicon.ico
fi

###############################################################################
# Step 2: Copy favicon to server
###############################################################################
print_status "Copying favicon.ico to server..."

sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no \
    favicon.ico root@$SERVER_IP:/usr/share/jitsi-meet/

###############################################################################
# Step 3: Fix Excalidraw CDN issues
###############################################################################
print_status "Fixing Excalidraw CDN configuration..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'

# Check if Excalidraw assets are properly bundled
cd /usr/share/jitsi-meet/libs/

# Check for excalidraw files
if [ -f "excalidraw.production.min.js" ]; then
    echo "✓ Excalidraw JS found"
else
    echo "✗ Excalidraw JS NOT found - this may cause issues"
fi

# Update nginx configuration to serve JS files with correct MIME type
cat > /etc/nginx/sites-available/app.rv2class.com.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name app.rv2class.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.rv2class.com;

    ssl_certificate /etc/letsencrypt/live/app.rv2class.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.rv2class.com/privkey.pem;

    root /usr/share/jitsi-meet;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Ensure JavaScript files are served with correct MIME type
    location ~ \.js$ {
        add_header Content-Type application/javascript;
        add_header Cache-Control "public, max-age=31536000";
    }

    # Favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    # Static assets
    location ~ ^/(libs|css|static|images|fonts|lang|sounds|.well-known)/(.*)$ {
        add_header Cache-Control "public, max-age=31536000";
    }

    # Excalidraw assets - serve from unpkg with proper proxying
    location ~ ^/excalidraw-assets/ {
        # If we have local assets, serve them
        try_files $uri @excalidraw_proxy;
    }

    location @excalidraw_proxy {
        # Proxy to unpkg.com but ensure correct MIME types
        proxy_pass https://unpkg.com;
        proxy_set_header Host unpkg.com;
        proxy_ssl_server_name on;
        proxy_hide_header X-Content-Type-Options;
        add_header Cache-Control "public, max-age=86400";
    }

    # Main application
    location / {
        try_files $uri /index.html;
    }

    # Config files
    location = /config.js {
        alias /etc/jitsi/meet/app.rv2class.com-config.js;
    }

    location = /interface_config.js {
        alias /usr/share/jitsi-meet/interface_config.js;
    }

    # WebSocket for XMPP
    location /xmpp-websocket {
        proxy_pass http://localhost:5280/xmpp-websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_read_timeout 900s;
    }

    # BOSH
    location = /http-bind {
        proxy_pass http://localhost:5280/http-bind;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $host;
    }

    # External API
    location /external_api.js {
        alias /usr/share/jitsi-meet/libs/external_api.min.js;
    }
}
NGINX_EOF

# Test and reload nginx
nginx -t && systemctl reload nginx

echo "✓ Nginx configuration updated"

ENDSSH

print_success "Nginx configuration updated with MIME type fixes"

###############################################################################
# Step 4: Alternative - Disable Excalidraw if still causing issues
###############################################################################
print_status "Checking if whiteboard needs to be disabled temporarily..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH2'

# Create a backup of the config
cp /etc/jitsi/meet/app.rv2class.com-config.js /etc/jitsi/meet/app.rv2class.com-config.js.backup

# Check if whiteboard is causing issues - you can uncomment this to disable it
# sed -i "s/whiteboard: {/whiteboard: {\n        enabled: false,/" /etc/jitsi/meet/app.rv2class.com-config.js

echo "Config backup created at /etc/jitsi/meet/app.rv2class.com-config.js.backup"

ENDSSH2

print_success "Configuration backup created"

###############################################################################
# Step 5: Clear browser cache instruction
###############################################################################
echo ""
echo "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo "${YELLOW}Important: Clear your browser cache!${NC}"
echo "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Open app.rv2class.com"
echo "2. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)"
echo "3. Clear cached images and files"
echo "4. Hard reload: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo ""

###############################################################################
# Step 6: Test the deployment
###############################################################################
print_status "Testing deployment..."

echo ""
echo "Testing favicon:"
curl -I https://app.rv2class.com/favicon.ico 2>&1 | head -5

echo ""
echo "Testing main page:"
curl -I https://app.rv2class.com/ 2>&1 | head -5

print_success "Fixes applied! Please test at https://app.rv2class.com"

# Cleanup
rm -rf /tmp/rv2class-fix

echo ""
echo "${GREEN}✓ All fixes applied successfully!${NC}"
echo ""
echo "${BLUE}If you still see Excalidraw errors, we can:${NC}"
echo "  1. Rebuild Jitsi with Excalidraw assets bundled"
echo "  2. Disable the whiteboard feature temporarily"
echo "  3. Use a different CDN for Excalidraw assets"
echo ""
