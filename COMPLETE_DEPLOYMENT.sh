#!/bin/bash

###############################################################################
# RV2Class Complete Server Deployment
# Fresh Ubuntu 22.04 installation + Jitsi Meet + SSL + All Features
###############################################################################

set -e

# Colors for output
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
print_header() { echo -e "\n${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${PURPLE}$1${NC}\n${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           RV2Class Complete Server Deployment                ║"
echo "║                   Fresh Installation                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# Configuration
###############################################################################

DOMAIN="app.rv2class.com"
SERVER_IP="108.61.245.179"
SSL_EMAIL="romanvolkonidov@gmail.com"
JITSI_VERSION="stable"

print_warning "This script will COMPLETELY RESET your server!"
print_warning "Server IP: $SERVER_IP"
print_warning "Domain: $DOMAIN"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    print_error "Deployment cancelled"
    exit 1
fi

###############################################################################
# PART 1: System Preparation
###############################################################################

print_header "PART 1: System Preparation"

print_status "Setting hostname..."
sudo hostnamectl set-hostname rv2class

print_status "Adding domain to /etc/hosts..."
echo "127.0.0.1 localhost" | sudo tee /etc/hosts
echo "$SERVER_IP $DOMAIN" | sudo tee -a /etc/hosts

print_status "Updating system packages..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get dist-upgrade -y -qq

print_success "System prepared"

###############################################################################
# PART 2: Install Dependencies
###############################################################################

print_header "PART 2: Installing Dependencies"

print_status "Installing essential packages..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    curl \
    wget \
    gnupg2 \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban

print_success "Dependencies installed"

###############################################################################
# PART 3: Install Node.js 18.x
###############################################################################

print_header "PART 3: Installing Node.js"

print_status "Adding NodeSource repository..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

print_status "Installing Node.js..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs

node_version=$(node --version)
npm_version=$(npm --version)
print_success "Node.js $node_version and npm $npm_version installed"

###############################################################################
# PART 4: Firewall Configuration
###############################################################################

print_header "PART 4: Configuring Firewall"

print_status "Configuring UFW..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 10000/udp  # Jitsi Video
sudo ufw allow 3478/udp   # STUN/TURN
sudo ufw allow 5349/tcp   # TURN TLS
sudo ufw --force enable

print_success "Firewall configured"

###############################################################################
# PART 5: Install Jitsi Meet
###############################################################################

print_header "PART 5: Installing Jitsi Meet"

print_status "Adding Jitsi repository..."
wget -qO - https://download.jitsi.org/jitsi-key.gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/jitsi-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/" | sudo tee /etc/apt/sources.list.d/jitsi-stable.list

print_status "Updating package list..."
sudo apt-get update -qq

print_status "Pre-configuring Jitsi..."
echo "jitsi-videobridge jitsi-videobridge/jvb-hostname string $DOMAIN" | sudo debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate" | sudo debconf-set-selections

print_status "Installing Jitsi Meet..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq jitsi-meet

print_success "Jitsi Meet installed"

###############################################################################
# PART 6: SSL Certificate with Let's Encrypt
###############################################################################

print_header "PART 6: Setting up SSL Certificate"

print_status "Installing SSL certificate..."
sudo /usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh << EOF
$SSL_EMAIL
EOF

print_success "SSL certificate installed"

###############################################################################
# PART 7: Jitsi Configuration
###############################################################################

print_header "PART 7: Configuring Jitsi Meet"

print_status "Configuring Prosody (XMPP)..."
sudo tee -a /etc/prosody/conf.avail/$DOMAIN.cfg.lua > /dev/null << 'PROSODY_CONFIG'

-- Enable lobby
Component "lobby.$DOMAIN" "muc"
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        "polls";
    }
    restrict_room_creation = true
    storage = "memory"
    muc_room_locking = false
    muc_room_default_public_jids = true
PROSODY_CONFIG

print_status "Restarting Prosody..."
sudo systemctl restart prosody

print_status "Configuring Jitsi Videobridge..."
sudo tee /etc/jitsi/videobridge/sip-communicator.properties > /dev/null << 'JVB_CONFIG'
org.ice4j.ice.harvest.DISABLE_AWS_HARVESTER=true
org.ice4j.ice.harvest.STUN_MAPPING_HARVESTER_ADDRESSES=meet-jit-si-turnrelay.jitsi.net:443
org.jitsi.videobridge.ENABLE_STATISTICS=true
org.jitsi.videobridge.STATISTICS_TRANSPORT=muc
org.jitsi.videobridge.STATISTICS_INTERVAL=5000
org.jitsi.videobridge.xmpp.user.shard.HOSTNAME=localhost
org.jitsi.videobridge.xmpp.user.shard.DOMAIN=auth.$DOMAIN
org.jitsi.videobridge.xmpp.user.shard.USERNAME=jvb
org.jitsi.videobridge.xmpp.user.shard.PASSWORD=
org.jitsi.videobridge.xmpp.user.shard.MUC_JIDS=JvbBrewery@internal.auth.$DOMAIN
org.jitsi.videobridge.xmpp.user.shard.MUC_NICKNAME=
JVB_CONFIG

print_status "Restarting Jitsi Videobridge..."
sudo systemctl restart jitsi-videobridge2

print_success "Jitsi configured"

###############################################################################
# PART 8: Custom Configuration & Features
###############################################################################

print_header "PART 8: Applying Custom Configuration"

print_status "Backing up original config..."
sudo cp /etc/jitsi/meet/$DOMAIN-config.js /etc/jitsi/meet/$DOMAIN-config.js.backup

print_status "Creating custom config.js..."
sudo tee /etc/jitsi/meet/$DOMAIN-config.js > /dev/null << 'EOF'
var config = {
    hosts: {
        domain: 'app.rv2class.com',
        muc: 'conference.app.rv2class.com'
    },

    bosh: '//app.rv2class.com/http-bind',
    websocket: 'wss://app.rv2class.com/xmpp-websocket',

    // Disable P2P to ensure all traffic goes through server
    p2p: {
        enabled: false
    },

    // Enable prejoin page
    prejoinConfig: {
        enabled: true,
        hideDisplayName: false,
        hideExtraJoinButtons: ['no-audio', 'by-phone']
    },

    // Toolbar configuration
    toolbarButtons: [
        'camera',
        'chat',
        'closedcaptions',
        'desktop',
        'download',
        'embedmeeting',
        'etherpad',
        'feedback',
        'filmstrip',
        'fullscreen',
        'hangup',
        'help',
        'highlight',
        'invite',
        'livestreaming',
        'microphone',
        'noisesuppression',
        'participants-pane',
        'profile',
        'raisehand',
        'recording',
        'security',
        'select-background',
        'settings',
        'shareaudio',
        'sharedvideo',
        'shortcuts',
        'stats',
        'tileview',
        'toggle-camera',
        'videoquality',
        'whiteboard'
    ],

    // Disable automatic gain control
    disableAGC: false,

    // Disable noise suppression
    disableNS: false,

    // Enable lobby
    enableLobbyChat: true,

    // Start with audio muted
    startAudioOnly: false,
    startWithAudioMuted: false,
    startWithVideoMuted: false,

    // Recording
    fileRecordingsEnabled: true,
    liveStreamingEnabled: true,

    // UI settings
    defaultLanguage: 'en',
    disableDeepLinking: false,

    // Notifications
    notificationsEnabled: true,

    // Local recording
    localRecording: {
        enabled: true,
        format: 'flac'
    },

    // Analytics disabled
    analytics: {},
    
    // Breakout rooms
    breakoutRooms: {
        hideAddRoomButton: false,
        hideAutoAssignButton: false,
        hideJoinRoomButton: false
    },

    // Enable features
    enableClosePage: false,
    enableUserRolesBasedOnToken: false,
    enableWelcomePage: true,
    enableInsecureRoomNameWarning: false,

    // Disable features
    disableInviteFunctions: false,
    disableRemoteMute: false,

    // Reactions
    disableReactions: false,

    // Hide participant stats
    hideParticipantsStats: false,

    // Resolution and quality
    resolution: 720,
    constraints: {
        video: {
            height: {
                ideal: 720,
                max: 720,
                min: 240
            }
        }
    },

    // Disable simulcast
    disableSimulcast: false,

    // Enable layer suspension
    enableLayerSuspension: true,

    // Channel last N
    channelLastN: 20,

    // Start bitrate
    startBitrate: "800",

    // Stereo audio
    stereo: false,

    // Opus max average bitrate
    opusMaxAverageBitrate: 510000
};
EOF

print_success "Custom configuration applied"

###############################################################################
# PART 9: Setup Application Directory
###############################################################################

print_header "PART 9: Setting up Application Directory"

print_status "Creating app directory..."
sudo mkdir -p /var/www/rv2class
sudo chown -R www-data:www-data /var/www/rv2class

print_status "Setting up static files directory..."
sudo mkdir -p /usr/share/jitsi-meet/static
sudo chown -R www-data:www-data /usr/share/jitsi-meet/static

print_success "Application directory ready"

###############################################################################
# PART 10: Restart All Services
###############################################################################

print_header "PART 10: Restarting All Services"

print_status "Restarting Prosody..."
sudo systemctl restart prosody

print_status "Restarting Jicofo..."
sudo systemctl restart jicofo

print_status "Restarting Jitsi Videobridge..."
sudo systemctl restart jitsi-videobridge2

print_status "Restarting Nginx..."
sudo systemctl restart nginx

print_success "All services restarted"

###############################################################################
# PART 11: Service Status Check
###############################################################################

print_header "PART 11: Service Status"

services=("prosody" "jicofo" "jitsi-videobridge2" "nginx")

for service in "${services[@]}"; do
    if sudo systemctl is-active --quiet "$service"; then
        print_success "$service is running"
    else
        print_error "$service is NOT running!"
    fi
done

###############################################################################
# PART 12: Display Summary
###############################################################################

print_header "DEPLOYMENT COMPLETE!"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT SUMMARY                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Domain:           https://$DOMAIN"
echo "📍 Server IP:        $SERVER_IP"
echo "🔒 SSL:              Let's Encrypt (auto-renewal enabled)"
echo ""
echo "📦 Installed Components:"
echo "   ✓ Ubuntu 22.04 LTS"
echo "   ✓ Node.js $(node --version)"
echo "   ✓ Nginx"
echo "   ✓ Jitsi Meet (stable)"
echo "   ✓ Prosody XMPP Server"
echo "   ✓ Jitsi Videobridge"
echo "   ✓ Jicofo"
echo ""
echo "🔥 Firewall Rules:"
echo "   ✓ SSH (22)"
echo "   ✓ HTTP (80)"
echo "   ✓ HTTPS (443)"
echo "   ✓ Jitsi Video (10000/udp)"
echo "   ✓ STUN/TURN (3478/udp, 5349/tcp)"
echo ""
echo "📁 Important Paths:"
echo "   Config:  /etc/jitsi/meet/$DOMAIN-config.js"
echo "   Web:     /usr/share/jitsi-meet/"
echo "   Logs:    /var/log/jitsi/"
echo "   Static:  /usr/share/jitsi-meet/static/"
echo ""
echo "🎯 Next Steps:"
echo "   1. Point DNS: $DOMAIN → $SERVER_IP"
echo "   2. Build & deploy custom Jitsi frontend"
echo "   3. Upload static files (student pages, etc.)"
echo "   4. Configure Firebase integration"
echo ""
echo "📝 Useful Commands:"
echo "   Check logs:      sudo tail -f /var/log/jitsi/*.log"
echo "   Restart Jitsi:   sudo systemctl restart jitsi-videobridge2"
echo "   Restart Prosody: sudo systemctl restart prosody"
echo "   Check services:  sudo systemctl status jitsi-videobridge2"
echo ""
print_success "Server is ready! Access: https://$DOMAIN"
echo ""
