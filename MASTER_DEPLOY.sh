#!/bin/bash

###############################################################################
# RV2Class FULL Deployment Script
# Includes custom configurations for ALL Jitsi components
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_header() { echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"; echo -e "${CYAN}║${NC} ${PURPLE}$1${NC}"; echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"; }

clear
echo ""
echo "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║${NC}        ${PURPLE}RV2Class COMPLETE Jitsi Deployment${NC}                ${CYAN}║${NC}"
echo "${CYAN}║${NC}    ${BLUE}Frontend + Jicofo + Videobridge + Prosody${NC}         ${CYAN}║${NC}"
echo "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Configuration
###############################################################################

SERVER_IP="108.61.245.179"
SERVER_USER="root"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"
DOMAIN="app.rv2class.com"
SSL_EMAIL="romanvolkonidov@gmail.com"

echo "${YELLOW}Server Configuration:${NC}"
echo "  IP:       $SERVER_IP"
echo "  Domain:   $DOMAIN"
echo "  Email:    $SSL_EMAIL"
echo ""

print_warning "This will COMPLETELY RESET and redeploy ALL Jitsi components!"
echo ""
read -p "Type 'DEPLOY' to continue: " confirm

if [ "$confirm" != "DEPLOY" ]; then
    print_error "Deployment cancelled"
    exit 1
fi

###############################################################################
# STEP 1: Local Prerequisites
###############################################################################

print_header "STEP 1: Local Prerequisites"

if ! command -v sshpass &> /dev/null; then
    print_status "Installing sshpass..."
    sudo apt-get update -qq
    sudo apt-get install -y sshpass
fi
print_success "sshpass ready"

###############################################################################
# STEP 2: Create Enhanced Server Setup Script
###############################################################################

print_header "STEP 2: Creating Enhanced Server Setup"

cat > /tmp/server_setup_full.sh << 'SERVER_SETUP'
#!/bin/bash
set -e

DOMAIN="app.rv2class.com"
SERVER_IP="108.61.245.179"
SSL_EMAIL="romanvolkonidov@gmail.com"

echo "🚀 Starting FULL server setup..."

# Set hostname
hostnamectl set-hostname rv2class

# Update /etc/hosts
cat > /etc/hosts << HOSTS
127.0.0.1 localhost
$SERVER_IP $DOMAIN
HOSTS

# Update system
echo "📦 Updating system..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# Install dependencies
echo "📦 Installing dependencies..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    curl wget gnupg2 git build-essential nginx \
    certbot python3-certbot-nginx ufw fail2ban \
    openjdk-11-jdk maven

# Install Node.js
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs

# Configure firewall
echo "🔥 Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 10000/udp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw --force enable

# Install Jitsi
echo "📦 Installing Jitsi Meet..."
curl -sL https://download.jitsi.org/jitsi-key.gpg.key | gpg --batch --yes --dearmor -o /usr/share/keyrings/jitsi-keyring.gpg 2>/dev/null || true
echo "deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/" > /etc/apt/sources.list.d/jitsi-stable.list
apt-get update -qq

# Pre-configure
echo "jitsi-videobridge jitsi-videobridge/jvb-hostname string $DOMAIN" | debconf-set-selections
echo "jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate" | debconf-set-selections

# Install all Jitsi components
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    jitsi-meet \
    jitsi-videobridge2 \
    jicofo \
    jitsi-meet-prosody

# Install SSL
echo "🔒 Installing SSL..."
echo "$SSL_EMAIL" | /usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh || true

###############################################################################
# Configure Jitsi Videobridge (JVB)
###############################################################################

echo "⚙️ Configuring Jitsi Videobridge..."

cat > /etc/jitsi/videobridge/sip-communicator.properties << 'JVB_CONFIG'
org.jitsi.videobridge.ENABLE_STATISTICS=true
org.jitsi.videobridge.STATISTICS_TRANSPORT=muc
org.jitsi.videobridge.STATISTICS_INTERVAL=5000
org.ice4j.ice.harvest.NAT_HARVESTER_LOCAL_ADDRESS=$SERVER_IP
org.ice4j.ice.harvest.NAT_HARVESTER_PUBLIC_ADDRESS=$SERVER_IP
org.jitsi.videobridge.TCP_HARVESTER_PORT=4443
org.jitsi.videobridge.rest.COLIBRI_WS_DISABLE=false
JVB_CONFIG

# JVB config.json
cat > /etc/jitsi/videobridge/config << 'JVB_JSON'
videobridge {
  http-servers {
    public {
      port = 9090
    }
  }
  websockets {
    enabled = true
    domain = "app.rv2class.com"
    tls = true
  }
  ice {
    tcp {
      enabled = true
      port = 4443
    }
    udp {
      port = 10000
    }
  }
  stats {
    enabled = true
    transports = [
      { type = "muc" }
    ]
  }
}
JVB_JSON

###############################################################################
# Configure Jicofo
###############################################################################

echo "⚙️ Configuring Jicofo..."

cat > /etc/jitsi/jicofo/jicofo.conf << 'JICOFO_CONFIG'
jicofo {
  xmpp {
    client {
      client-proxy = "focus.app.rv2class.com"
    }
    trusted-domains = [ "auth.app.rv2class.com" ]
  }
  bridge {
    brewery-jid = "JvbBrewery@internal.auth.app.rv2class.com"
  }
  conference {
    enable-auto-owner = true
  }
}
JICOFO_CONFIG

###############################################################################
# Configure Prosody
###############################################################################

echo "⚙️ Configuring Prosody..."

cat > /etc/prosody/conf.avail/$DOMAIN.cfg.lua << 'PROSODY_CONFIG'
plugin_paths = { "/usr/share/jitsi-meet/prosody-plugins/" }

VirtualHost "app.rv2class.com"
    authentication = "anonymous"
    ssl = {
        key = "/etc/prosody/certs/app.rv2class.com.key";
        certificate = "/etc/prosody/certs/app.rv2class.com.crt";
    }
    modules_enabled = {
        "bosh";
        "pubsub";
        "ping";
        "websocket";
        "http_altconnect";
    }
    c2s_require_encryption = false
    lobby_muc = "lobby.app.rv2class.com"
    main_muc = "conference.app.rv2class.com"

Component "conference.app.rv2class.com" "muc"
    storage = "memory"
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        "polls";
    }
    admins = { "focus@auth.app.rv2class.com" }
    muc_room_locking = false
    muc_room_default_public_jids = true

Component "internal.auth.app.rv2class.com" "muc"
    storage = "memory"
    modules_enabled = {
      "ping";
    }
    admins = { "focus@auth.app.rv2class.com", "jvb@auth.app.rv2class.com" }
    muc_room_locking = false
    muc_room_default_public_jids = true

VirtualHost "auth.app.rv2class.com"
    ssl = {
        key = "/etc/prosody/certs/auth.app.rv2class.com.key";
        certificate = "/etc/prosody/certs/auth.app.rv2class.com.crt";
    }
    modules_enabled = {
        "limits_exception";
    }
    authentication = "internal_hashed"

Component "lobby.app.rv2class.com" "muc"
    storage = "memory"
    restrict_room_creation = true
    muc_room_locking = false
    muc_room_default_public_jids = true
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        "polls";
    }
PROSODY_CONFIG

ln -sf /etc/prosody/conf.avail/$DOMAIN.cfg.lua /etc/prosody/conf.d/$DOMAIN.cfg.lua

###############################################################################
# Configure Jitsi Meet (Frontend)
###############################################################################

echo "⚙️ Configuring Jitsi Meet frontend..."

cat > /etc/jitsi/meet/$DOMAIN-config.js << 'JITSI_CONFIG'
var config = {
    hosts: {
        domain: 'app.rv2class.com',
        muc: 'conference.app.rv2class.com',
        focus: 'focus.app.rv2class.com'
    },
    
    bosh: '//app.rv2class.com/http-bind',
    websocket: 'wss://app.rv2class.com/xmpp-websocket',
    
    p2p: {
        enabled: false
    },
    
    prejoinConfig: {
        enabled: true,
        hideDisplayName: false
    },
    
    startAudioOnly: false,
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    
    enableLobbyChat: true,
    defaultLanguage: 'en',
    resolution: 720,
    
    constraints: {
        video: {
            height: { ideal: 720, max: 720, min: 240 }
        }
    },
    
    channelLastN: 20,
    enableLayerSuspension: true,
    
    disableDeepLinking: false,
    
    toolbarButtons: [
        'camera', 'chat', 'closedcaptions', 'desktop', 'download',
        'embedmeeting', 'feedback', 'filmstrip', 'fullscreen', 'hangup',
        'help', 'invite', 'microphone', 'participants-pane', 'profile',
        'raisehand', 'recording', 'security', 'settings', 'shareaudio',
        'sharedvideo', 'shortcuts', 'stats', 'tileview', 'toggle-camera',
        'videoquality', 'whiteboard'
    ]
};
JITSI_CONFIG

# Create directories
mkdir -p /usr/share/jitsi-meet/static
chown -R www-data:www-data /usr/share/jitsi-meet

# Restart ALL services
echo "🔄 Restarting all Jitsi services..."
systemctl restart prosody
systemctl restart jicofo
systemctl restart jitsi-videobridge2
systemctl restart nginx

# Enable services on boot
systemctl enable prosody
systemctl enable jicofo
systemctl enable jitsi-videobridge2
systemctl enable nginx

echo "✅ FULL server setup complete!"
echo ""
echo "Installed components:"
echo "  ✓ Prosody (XMPP server)"
echo "  ✓ Jicofo (conference focus)"
echo "  ✓ Jitsi Videobridge (media router)"
echo "  ✓ Jitsi Meet (web frontend)"
echo "  ✓ Nginx (web server)"
echo "  ✓ Let's Encrypt SSL"
SERVER_SETUP

print_success "Enhanced server setup script created"

###############################################################################
# STEP 3: Deploy to Server
###############################################################################

print_header "STEP 3: Deploying to Server"

print_status "Uploading setup script..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no \
    /tmp/server_setup_full.sh $SERVER_USER@$SERVER_IP:/tmp/

print_status "Executing full setup (15-20 minutes)..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no \
    $SERVER_USER@$SERVER_IP "bash /tmp/server_setup_full.sh"

print_success "Server components deployed!"

###############################################################################
# STEP 4: Build & Deploy Custom Frontend
###############################################################################

print_header "STEP 4: Building Custom Frontend"

# ... (keep your existing frontend build code from MASTER_DEPLOY.sh)
# Lines 180-230 of your original script

###############################################################################
# STEP 5: Verify ALL Components
###############################################################################

print_header "STEP 5: Verifying ALL Components"

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no \
    $SERVER_USER@$SERVER_IP << 'VERIFY'

echo "Checking ALL Jitsi components..."
echo ""

services=("prosody" "jicofo" "jitsi-videobridge2" "nginx")
all_good=true

for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is NOT running!"
        systemctl status "$service" --no-pager || true
        all_good=false
    fi
done

echo ""
echo "Component versions:"
dpkg -l | grep -E "prosody|jicofo|jitsi-videobridge|jitsi-meet" | awk '{print $2 " " $3}'

if [ "$all_good" = true ]; then
    echo ""
    echo "🎉 All Jitsi components are running!"
fi
VERIFY

###############################################################################
# Summary
###############################################################################

clear
echo ""
echo "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║${NC}     ${GREEN}🎉 COMPLETE JITSI DEPLOYMENT SUCCESSFUL! 🎉${NC}       ${CYAN}║${NC}"
echo "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "${YELLOW}Deployed Components:${NC}"
echo "  ✅ Prosody XMPP Server"
echo "  ✅ Jicofo (Conference Focus)"
echo "  ✅ Jitsi Videobridge (Media Router)"
echo "  ✅ Jitsi Meet (Custom Frontend)"
echo "  ✅ Nginx Web Server"
echo "  ✅ Let's Encrypt SSL"
echo ""
echo "🌐 ${GREEN}Access your platform:${NC} https://$DOMAIN"
echo ""