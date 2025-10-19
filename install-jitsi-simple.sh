#!/bin/bash

# Simplified Jitsi installation for 108.61.245.179
# Run this directly on the server

echo "========================================="
echo "Installing Jitsi Meet on app.rv2class.com"
echo "========================================="

# Update system
apt-get update

# Install Jitsi repository
curl https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmor > /usr/share/keyrings/jitsi-keyring.gpg
echo 'deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/' | tee /etc/apt/sources.list.d/jitsi-stable.list
apt-get update

# Pre-configure to avoid prompts
echo "jitsi-videobridge jitsi-videobridge/jvb-hostname string app.rv2class.com" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate" | debconf-set-selections

# Install Jitsi Meet
DEBIAN_FRONTEND=noninteractive apt-get install -y jitsi-meet

# Install Coturn
apt-get install -y coturn

echo ""
echo "✅ Jitsi Meet + Coturn installed!"
echo ""
echo "Next steps:"
echo "1. Copy custom config: scp jitsi-custom/jitsi-meet/config.js root@108.61.245.179:/etc/jitsi/meet/app.rv2class.com-config.js"
echo "2. Get SSL: /usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh"
echo "3. Configure Coturn with the setup script"
echo ""
