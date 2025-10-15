#!/bin/bash

###############################################################################
# Jitsi Meet Quick Install on Vultr
# Single VPS deployment - Much simpler than Fly.io multi-app
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         Jitsi Meet Installation on Vultr (Ubuntu 22.04)      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# Prerequisites Check
###############################################################################

print_status "Checking system..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root: sudo su -"
    exit 1
fi

# Check Ubuntu version
if [ ! -f /etc/lsb-release ]; then
    print_error "This script is for Ubuntu only"
    exit 1
fi

###############################################################################
# Get Configuration
###############################################################################

print_status "Configuration needed..."

# Get domain
read -p "Enter your domain for Jitsi (e.g., jitsi.rv2class.com): " JITSI_DOMAIN

if [ -z "$JITSI_DOMAIN" ]; then
    print_error "Domain is required!"
    exit 1
fi

# Get email for Let's Encrypt
read -p "Enter your email for Let's Encrypt SSL: " SSL_EMAIL

if [ -z "$SSL_EMAIL" ]; then
    print_error "Email is required!"
    exit 1
fi

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)
print_status "Your public IP: $PUBLIC_IP"
echo ""
print_warning "IMPORTANT: Point $JITSI_DOMAIN to $PUBLIC_IP before continuing!"
print_warning "Add an A record in your DNS: $JITSI_DOMAIN -> $PUBLIC_IP"
echo ""
read -p "Have you added the DNS record? (y/n): " dns_ready

if [[ ! $dns_ready =~ ^[Yy]$ ]]; then
    print_error "Please add DNS record first, then run this script again"
    exit 1
fi

###############################################################################
# Update System
###############################################################################

print_status "Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get install -y apt-transport-https gnupg2 curl

###############################################################################
# Set Hostname
###############################################################################

print_status "Setting hostname..."
hostnamectl set-hostname $JITSI_DOMAIN
echo "$PUBLIC_IP $JITSI_DOMAIN" >> /etc/hosts

###############################################################################
# Configure Firewall
###############################################################################

print_status "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 10000/udp
ufw allow 4443/tcp
ufw --force enable

###############################################################################
# Install Jitsi Meet
###############################################################################

print_status "Adding Jitsi repository..."
curl https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmor > /usr/share/keyrings/jitsi-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/" | tee /etc/apt/sources.list.d/jitsi-stable.list

print_status "Installing Jitsi Meet..."
apt-get update

# Pre-configure answers for non-interactive install
echo "jitsi-videobridge jitsi-videobridge/jvb-hostname string $JITSI_DOMAIN" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate" | debconf-set-selections

apt-get install -y jitsi-meet

###############################################################################
# Install Let's Encrypt SSL
###############################################################################

print_status "Installing Let's Encrypt SSL certificate..."
echo "$SSL_EMAIL" | /usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh

###############################################################################
# Configure Jitsi for Better Performance
###############################################################################

print_status "Optimizing Jitsi configuration..."

# Enable better video quality
cat >> /etc/jitsi/meet/$JITSI_DOMAIN-config.js << 'EOF'

// Custom RV2Class configuration
config.resolution = 720;
config.constraints = {
    video: {
        height: { ideal: 720, max: 720, min: 360 },
        width: { ideal: 1280, max: 1280, min: 640 }
    }
};

// Enable better audio
config.enableNoAudioDetection = true;
config.enableNoisyMicDetection = true;

// Optimize for 1-on-1 calls
config.channelLastN = 2;
config.startAudioOnly = false;
config.startAudioMuted = false;
config.startWithVideoMuted = false;

// Disable some features for simplicity
config.disableDeepLinking = true;
config.enableWelcomePage = false;
EOF

# Configure JVB for better NAT traversal
cat > /etc/jitsi/videobridge/sip-communicator.properties << EOF
org.ice4j.ice.harvest.STUN_MAPPING_HARVESTER_ADDRESSES=stun.l.google.com:19302
org.jitsi.videobridge.ENABLE_STATISTICS=true
org.jitsi.videobridge.STATISTICS_TRANSPORT=muc
org.jitsi.videobridge.xmpp.user.shard.HOSTNAME=$JITSI_DOMAIN
org.jitsi.videobridge.xmpp.user.shard.DOMAIN=auth.$JITSI_DOMAIN
org.jitsi.videobridge.xmpp.user.shard.USERNAME=jvb
org.jitsi.videobridge.xmpp.user.shard.PASSWORD=$(openssl rand -hex 16)
org.jitsi.videobridge.xmpp.user.shard.MUC_JIDS=JvbBrewery@internal.auth.$JITSI_DOMAIN
org.jitsi.videobridge.xmpp.user.shard.MUC_NICKNAME=$(hostname)
EOF

###############################################################################
# Restart Services
###############################################################################

print_status "Restarting Jitsi services..."
systemctl restart prosody
systemctl restart jicofo
systemctl restart jitsi-videobridge2
systemctl restart nginx

###############################################################################
# Test Configuration
###############################################################################

print_status "Testing services..."
sleep 5

if systemctl is-active --quiet prosody && \
   systemctl is-active --quiet jicofo && \
   systemctl is-active --quiet jitsi-videobridge2 && \
   systemctl is-active --quiet nginx; then
    print_success "All services are running!"
else
    print_error "Some services failed to start. Check logs:"
    echo "  journalctl -u prosody -n 50"
    echo "  journalctl -u jicofo -n 50"
    echo "  journalctl -u jitsi-videobridge2 -n 50"
    exit 1
fi

###############################################################################
# Save Configuration
###############################################################################

print_status "Saving configuration..."

cat > /root/jitsi-info.txt << EOF
========================================
Jitsi Meet Installation Complete!
========================================

Domain: https://$JITSI_DOMAIN
Public IP: $PUBLIC_IP
Email: $SSL_EMAIL

Installation Date: $(date)

========================================
Service Commands:
========================================

Check status:
  systemctl status prosody
  systemctl status jicofo
  systemctl status jitsi-videobridge2
  systemctl status nginx

View logs:
  journalctl -u prosody -f
  journalctl -u jicofo -f
  journalctl -u jitsi-videobridge2 -f

Restart services:
  systemctl restart prosody jicofo jitsi-videobridge2 nginx

========================================
Configuration Files:
========================================

Web config: /etc/jitsi/meet/$JITSI_DOMAIN-config.js
Interface: /usr/share/jitsi-meet/interface_config.js
Video bridge: /etc/jitsi/videobridge/sip-communicator.properties
Prosody: /etc/prosody/conf.avail/$JITSI_DOMAIN.cfg.lua

========================================
Next Steps:
========================================

1. Test your Jitsi: https://$JITSI_DOMAIN

2. Update your frontend (JitsiRoom.tsx):
   const domain = "$JITSI_DOMAIN";

3. Redeploy your Vercel app

4. Enjoy your self-hosted Jitsi!

========================================
Optional: Add Coturn
========================================

For better connectivity behind firewalls:
  1. Deploy Coturn on another Vultr server
  2. Run: ./setup-coturn-vultr.sh
  3. Update Jitsi config with TURN server

========================================
EOF

chmod 600 /root/jitsi-info.txt

###############################################################################
# Final Summary
###############################################################################

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              Jitsi Meet Installation Complete!                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
print_success "Your Jitsi Meet server is ready!"
echo ""
echo "🌐 URL: https://$JITSI_DOMAIN"
echo "📧 SSL Email: $SSL_EMAIL"
echo "🔒 SSL: Let's Encrypt (auto-renews)"
echo ""
print_status "Configuration saved to: /root/jitsi-info.txt"
echo ""
echo "Next steps:"
echo "  1. Test Jitsi: https://$JITSI_DOMAIN"
echo "  2. Update frontend to use this domain"
echo "  3. Optionally add Coturn for better connectivity"
echo ""
print_success "Happy video conferencing! 🎥✨"
echo ""

# Display the info file
cat /root/jitsi-info.txt
