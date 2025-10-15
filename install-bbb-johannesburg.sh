#!/bin/bash

# Complete BBB 3.0 Installation Script for Johannesburg Server
# Server IP: 139.84.240.149
# Domain: bbb.rv2class.com

set -e

JHB_IP="139.84.240.149"
DOMAIN="bbb.rv2class.com"
EMAIL="romanvolkonidov@gmail.com"

echo "🌍 Installing BigBlueButton 3.0 on Johannesburg Server"
echo "======================================================"
echo "Server: $JHB_IP"
echo "Domain: $DOMAIN"
echo ""

# Step 1: Ensure firewall is open (already done via ufw)
echo "Step 1: Verifying firewall..."
ssh root@$JHB_IP "ufw status" || true

# Step 2: Create necessary directories
echo ""
echo "Step 2: Creating required directories..."
ssh root@$JHB_IP 'bash -s' << 'EOF'
mkdir -p /usr/local/bigbluebutton/bbb-webrtc-sfu/config
mkdir -p /usr/local/bigbluebutton/core/scripts
mkdir -p /var/www/bigbluebutton-default/.well-known/acme-challenge
mkdir -p /etc/bigbluebutton
chown -R www-data:www-data /var/www/bigbluebutton-default
EOF

# Step 3: Create basic Nginx config for SSL
echo ""
echo "Step 3: Setting up Nginx for SSL..."
ssh root@$JHB_IP 'bash -s' << 'NGINXEOF'
cat > /etc/nginx/sites-available/bigbluebutton <<'NGINX'
server {
    listen 80;
    server_name bbb.rv2class.com;
    root /var/www/bigbluebutton-default;
    
    location /.well-known/acme-challenge/ {
        root /var/www/bigbluebutton-default;
        allow all;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/bigbluebutton /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
NGINXEOF

# Step 4: Get SSL certificate
echo ""
echo "Step 4: Getting SSL certificate..."
ssh root@$JHB_IP "certbot certonly --webroot -w /var/www/bigbluebutton-default/ -d $DOMAIN --non-interactive --agree-tos -m $EMAIL"

if [ $? -ne 0 ]; then
    echo "❌ SSL certificate failed. Check DNS and firewall."
    exit 1
fi

# Step 5: Install BBB packages manually
echo ""
echo "Step 5: Installing BBB 3.0 packages..."
ssh root@$JHB_IP 'bash -s' << 'BBBEOF'
apt-get update
apt-get install -y --fix-broken

# Install BBB core packages in order
apt-get install -y bbb-apps-akka bbb-fsesl-akka bbb-webrtc-recorder || true
apt-get install -y bbb-freeswitch-core bbb-freeswitch-sounds || true

# Create missing config files before installing dependent packages
mkdir -p /usr/local/bigbluebutton/bbb-webrtc-sfu/config
mkdir -p /usr/local/bigbluebutton/core/scripts

# Create dummy config to allow package installation
cat > /usr/local/bigbluebutton/core/scripts/bigbluebutton.yml << 'YML'
playback_host: bbb.rv2class.com
YML

# Now install the rest
apt-get install -y --fix-broken
apt-get install -y bigbluebutton

# Fix any remaining issues
dpkg --configure -a
BBBEOF

# Step 6: Configure BBB
echo ""
echo "Step 6: Configuring BBB..."
ssh root@$JHB_IP "bbb-conf --setip $DOMAIN && bbb-conf --restart"

# Step 7: Get credentials
echo ""
echo "Step 7: Getting BBB credentials..."
ssh root@$JHB_IP "bbb-conf --secret"

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next step: Run ./switch-to-jhb-bbb.sh to update your app"
