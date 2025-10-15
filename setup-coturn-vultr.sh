#!/bin/bash

###############################################################################
# Coturn TURN/STUN Server Setup Script for Vultr
# Purpose: Provides NAT traversal for WebRTC (Jitsi Meet)
# Server: Ubuntu 22.04 LTS on Vultr
###############################################################################

set -e  # Exit on error

echo "================================================"
echo "  Coturn TURN/STUN Server Setup for Vultr"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COTURN_USER="rv2class"
TURN_SECRET=$(openssl rand -hex 32)
REALM="rv2class.com"
PUBLIC_IP=""
MIN_PORT=49152
MAX_PORT=65535

###############################################################################
# Helper Functions
###############################################################################

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

###############################################################################
# Step 1: System Update
###############################################################################

print_status "Updating system packages..."
apt-get update
apt-get upgrade -y
print_success "System updated!"

###############################################################################
# Step 2: Get Public IP
###############################################################################

print_status "Detecting public IP address..."
PUBLIC_IP=$(curl -s ifconfig.me)
if [ -z "$PUBLIC_IP" ]; then
    print_error "Could not detect public IP. Please enter manually:"
    read -p "Public IP: " PUBLIC_IP
fi
print_success "Public IP: $PUBLIC_IP"

###############################################################################
# Step 3: Install Coturn
###############################################################################

print_status "Installing Coturn..."
apt-get install -y coturn
print_success "Coturn installed!"

###############################################################################
# Step 4: Configure Coturn
###############################################################################

print_status "Configuring Coturn..."

# Backup original config
if [ -f /etc/turnserver.conf ]; then
    cp /etc/turnserver.conf /etc/turnserver.conf.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create new configuration
cat > /etc/turnserver.conf << EOF
# Coturn Configuration for RV2Class
# Generated: $(date)

# Listening port for TURN/STUN
listening-port=3478

# TLS listening port (for secure connections)
tls-listening-port=5349

# Listening IP (use 0.0.0.0 to listen on all interfaces)
listening-ip=0.0.0.0

# Relay IP (your public IP)
relay-ip=$PUBLIC_IP

# External IP (advertise this IP to clients)
external-ip=$PUBLIC_IP

# Realm (used for authentication)
realm=$REALM

# Server name
server-name=turn.rv2class.com

# Use fingerprint in TURN messages
fingerprint

# Use long-term credentials mechanism
lt-cred-mech

# Static user account (username:password format)
user=$COTURN_USER:$TURN_SECRET

# For PostgreSQL or MySQL, use this:
# psql-userdb="host=localhost dbname=coturn user=coturn password=secret"

# Port range for relay endpoints
min-port=$MIN_PORT
max-port=$MAX_PORT

# Logging
verbose
log-file=/var/log/turnserver/turnserver.log

# Misc security settings
no-cli
no-loopback-peers
no-multicast-peers

# Deny access to private IP ranges (security)
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=172.16.0.0-172.31.255.255

# Allow loopback for testing (remove in production)
# allow-loopback-peers

# Mobility with ICE
mobility

# No TLS (use if you don't have SSL certificates)
no-tls

# If you have SSL certificates, uncomment and configure:
# cert=/etc/letsencrypt/live/turn.rv2class.com/fullchain.pem
# pkey=/etc/letsencrypt/live/turn.rv2class.com/privkey.pem

# Prometheus metrics (optional)
# prometheus

# Bandwidth limitation (optional, in KB/s)
# max-bps=1000000
# bps-capacity=0

# Total allocation quota (optional)
# total-quota=100
# user-quota=10
EOF

print_success "Coturn configured!"

###############################################################################
# Step 5: Enable Coturn Service
###############################################################################

print_status "Enabling Coturn service..."

# Enable Coturn to start on boot
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

print_success "Coturn enabled!"

###############################################################################
# Step 6: Create Log Directory
###############################################################################

print_status "Setting up logging..."
mkdir -p /var/log/turnserver
chown turnserver:turnserver /var/log/turnserver
print_success "Logging configured!"

###############################################################################
# Step 7: Configure Firewall
###############################################################################

print_status "Configuring firewall..."

# Install ufw if not present
if ! command -v ufw &> /dev/null; then
    apt-get install -y ufw
fi

# Configure UFW
ufw --force enable
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp

# Allow Coturn ports
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 5349/udp

# Allow relay port range
ufw allow $MIN_PORT:$MAX_PORT/tcp
ufw allow $MIN_PORT:$MAX_PORT/udp

print_success "Firewall configured!"

###############################################################################
# Step 8: Start Coturn
###############################################################################

print_status "Starting Coturn service..."
systemctl restart coturn
systemctl enable coturn
sleep 2

if systemctl is-active --quiet coturn; then
    print_success "Coturn is running!"
else
    print_error "Coturn failed to start. Check logs with: journalctl -u coturn -n 50"
    exit 1
fi

###############################################################################
# Step 9: Test Coturn
###############################################################################

print_status "Testing Coturn connectivity..."

# Test STUN
if nc -zvu $PUBLIC_IP 3478 2>&1 | grep -q "succeeded\|open"; then
    print_success "STUN port 3478/UDP is reachable!"
else
    print_warning "Could not verify STUN port. May need to check from external network."
fi

###############################################################################
# Step 10: Save Credentials
###############################################################################

print_status "Saving credentials..."

cat > /root/coturn-credentials.txt << EOF
========================================
Coturn TURN/STUN Server Credentials
========================================

Server IP: $PUBLIC_IP
STUN URL: stun:$PUBLIC_IP:3478
TURN URL: turn:$PUBLIC_IP:3478

Username: $COTURN_USER
Password: $TURN_SECRET
Realm: $REALM

For Jitsi Meet configuration:
stunServers: [ { urls: 'stun:$PUBLIC_IP:3478' } ]

p2p.stunServers: [
  { urls: 'stun:$PUBLIC_IP:3478' }
]

p2p.iceTransportPolicy: 'all'

========================================
Testing URLs (use in browser):
========================================

Test STUN: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
Test TURN: https://icetest.info/

Enter this in the test:
STUN: stun:$PUBLIC_IP:3478
TURN: turn:$PUBLIC_IP:3478
Username: $COTURN_USER
Password: $TURN_SECRET

========================================
Commands:
========================================

Status: systemctl status coturn
Logs: journalctl -u coturn -f
Restart: systemctl restart coturn
Stop: systemctl stop coturn

Configuration: /etc/turnserver.conf
Credentials: /root/coturn-credentials.txt

========================================
EOF

chmod 600 /root/coturn-credentials.txt
print_success "Credentials saved to /root/coturn-credentials.txt"

###############################################################################
# Final Summary
###############################################################################

echo ""
echo "================================================"
echo -e "${GREEN}  Coturn Setup Complete!${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}Server Information:${NC}"
echo "  Public IP: $PUBLIC_IP"
echo "  STUN: stun:$PUBLIC_IP:3478"
echo "  TURN: turn:$PUBLIC_IP:3478"
echo ""
echo -e "${BLUE}Credentials:${NC}"
echo "  Username: $COTURN_USER"
echo "  Password: $TURN_SECRET"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Test your TURN server: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/"
echo "  2. Add STUN/TURN config to your Jitsi setup"
echo "  3. Update JitsiRoom.tsx with your TURN server details"
echo ""
echo -e "${BLUE}Important Files:${NC}"
echo "  - Config: /etc/turnserver.conf"
echo "  - Credentials: /root/coturn-credentials.txt"
echo "  - Logs: /var/log/turnserver/turnserver.log"
echo ""
echo -e "${GREEN}Coturn is now running!${NC}"
echo "================================================"
echo ""

# Display credentials one more time
cat /root/coturn-credentials.txt
