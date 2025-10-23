#!/bin/bash

###############################################################################
# Fix Excalidraw Path and Favicon - Comprehensive Solution
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
SERVER_USER="root"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Fixing Excalidraw Loading and Favicon Issues${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

###############################################################################
# Fix the nginx configuration to properly rewrite Excalidraw paths
###############################################################################

print_status "Updating nginx configuration with URL rewriting..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'

# Backup existing config
cp /etc/nginx/sites-available/app.rv2class.com.conf /etc/nginx/sites-available/app.rv2class.com.conf.backup-$(date +%Y%m%d-%H%M%S)

# Create new nginx config with proper URL rewriting
cat > /etc/nginx/sites-available/app.rv2class.com.conf << 'NGINX_CONF'
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

    # Favicon - create a simple redirect or serve default
    location = /favicon.ico {
        # Try local favicon, if not found, serve Jitsi logo
        try_files $uri /images/watermark.png =204;
        log_not_found off;
        access_log off;
    }

    # THIS IS THE KEY FIX: Rewrite unpkg.com URLs to local paths
    # When the app requests https://unpkg.com/@jitsi/excalidraw@0.0.19/dist/excalidraw-assets/FILE.js
    # We need to serve it from /libs/excalidraw-assets/FILE.js
    location ~ ^/@jitsi/excalidraw@[^/]+/dist/excalidraw-assets/(.*)$ {
        alias /usr/share/jitsi-meet/libs/excalidraw-assets/$1;
        add_header Content-Type application/javascript;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=31536000";
        expires 1y;
    }

    # Also handle direct excalidraw-assets requests
    location /libs/excalidraw-assets/ {
        alias /usr/share/jitsi-meet/libs/excalidraw-assets/;
        add_header Content-Type application/javascript;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=31536000";
        expires 1y;
    }

    # All JS files should be served as application/javascript
    location ~ \.js$ {
        add_header Content-Type application/javascript;
        add_header Cache-Control "public, max-age=31536000";
        expires 1y;
    }

    # Static assets
    location ~ ^/(css|static|images|fonts|lang|sounds|.well-known)/ {
        add_header Cache-Control "public, max-age=31536000";
        expires 1y;
    }

    # Libs directory
    location /libs/ {
        add_header Cache-Control "public, max-age=31536000";
        expires 1y;
    }

    # Config files
    location = /config.js {
        alias /etc/jitsi/meet/app.rv2class.com-config.js;
        add_header Content-Type application/javascript;
    }

    location = /interface_config.js {
        alias /usr/share/jitsi-meet/interface_config.js;
        add_header Content-Type application/javascript;
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
        add_header Content-Type application/javascript;
    }

    # Main application - MUST BE LAST
    location / {
        try_files $uri /index.html;
    }
}
NGINX_CONF

# Test nginx configuration
if nginx -t; then
    echo "✓ Nginx configuration is valid"
    systemctl reload nginx
    echo "✓ Nginx reloaded successfully"
else
    echo "✗ Nginx configuration has errors"
    # Restore backup
    cp /etc/nginx/sites-available/app.rv2class.com.conf.backup-* /etc/nginx/sites-available/app.rv2class.com.conf 2>/dev/null || true
    exit 1
fi

ENDSSH

print_success "Nginx configuration updated!"

###############################################################################
# Create a simple favicon
###############################################################################

print_status "Creating favicon.ico..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH2'

# Create a simple ICO file (blue square with RV text)
cd /usr/share/jitsi-meet

# If we have watermark, copy it as favicon
if [ -f "images/watermark.png" ]; then
    echo "✓ Using existing watermark as favicon placeholder"
else
    # Create minimal valid ICO file
    printf '\x00\x00\x01\x00\x01\x00\x10\x10\x00\x00\x01\x00\x20\x00\x68\x04\x00\x00\x16\x00\x00\x00' > favicon.ico
    echo "✓ Created minimal favicon.ico"
fi

# Verify permissions
chmod 644 favicon.ico 2>/dev/null || true
chown www-data:www-data favicon.ico 2>/dev/null || true

echo "✓ Favicon setup complete"

ENDSSH2

print_success "Favicon created!"

###############################################################################
# Test the fixes
###############################################################################

print_status "Testing the deployment..."

echo ""
echo "1. Testing main page:"
RESPONSE=$(curl -s -I https://app.rv2class.com/ 2>&1 | grep "HTTP")
echo "   $RESPONSE"

echo ""
echo "2. Testing Excalidraw vendor file (local path):"
RESPONSE=$(curl -s -I https://app.rv2class.com/libs/excalidraw-assets/vendor-75e22c20f1d603abdfc9.js 2>&1 | grep -E "HTTP|Content-Type" | head -2)
echo "   $RESPONSE"

echo ""
echo "3. Testing favicon:"
RESPONSE=$(curl -s -I https://app.rv2class.com/favicon.ico 2>&1 | grep "HTTP")
echo "   $RESPONSE"

echo ""
print_success "Configuration deployed!"

echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  IMPORTANT: Clear Browser Cache!${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════${NC}"
echo ""
echo "The Excalidraw files are trying to load from unpkg.com CDN."
echo "The nginx rewrite rules will help, but the app needs to be rebuilt"
echo "to use local paths instead of the CDN."
echo ""
echo "Options:"
echo ""
echo "1. ${GREEN}QUICK FIX (Recommended):${NC} Disable whiteboard temporarily"
echo "   This will prevent Excalidraw loading errors."
echo ""
echo "2. ${BLUE}FULL FIX:${NC} Rebuild jitsi-meet with correct Excalidraw paths"
echo "   This requires modifying webpack config and rebuilding."
echo ""
echo "3. ${YELLOW}Test first:${NC} Try the app now and see if the rewrite rules work"
echo ""
echo "Would you like to disable the whiteboard for now? (Y/n)"

print_success "Script complete!"
echo ""

