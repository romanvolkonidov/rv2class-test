#!/bin/bash

###############################################################################
# RV2Class Custom Frontend Build & Deploy
# Builds custom Jitsi Meet and uploads to server
###############################################################################

set -e

# Colors
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
echo "║         RV2Class Custom Frontend Deployment                  ║"
echo "║              Build & Upload to Server                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# Configuration
###############################################################################

SERVER_IP="108.61.245.179"
SERVER_USER="root"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF"
DOMAIN="app.rv2class.com"

JITSI_DIR="$(pwd)/jitsi-custom/jitsi-meet"
BUILD_DIR="$JITSI_DIR/build"

###############################################################################
# PART 1: Pre-flight Checks
###############################################################################

print_header "PART 1: Pre-flight Checks"

if [ ! -d "$JITSI_DIR" ]; then
    print_error "Jitsi directory not found: $JITSI_DIR"
    exit 1
fi

print_success "Found Jitsi directory"

print_status "Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    exit 1
fi

node_version=$(node --version)
print_success "Node.js $node_version found"

print_status "Checking npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
fi

npm_version=$(npm --version)
print_success "npm $npm_version found"

###############################################################################
# PART 2: Install Dependencies
###############################################################################

print_header "PART 2: Installing Dependencies"

cd "$JITSI_DIR"

print_status "Installing npm dependencies..."
npm install --legacy-peer-deps

print_success "Dependencies installed"

###############################################################################
# PART 3: Build Custom Jitsi
###############################################################################

print_header "PART 3: Building Custom Jitsi"

print_status "Running webpack build..."
print_warning "This may take 5-10 minutes..."

# Build the application using make
make || {
    print_error "Build failed!"
    exit 1
}

print_success "Build completed successfully!"

###############################################################################
# PART 4: Prepare Deployment Package
###############################################################################

print_header "PART 4: Preparing Deployment Package"

print_status "Creating deployment directory..."
DEPLOY_DIR="/tmp/rv2class-deploy-$(date +%s)"
mkdir -p "$DEPLOY_DIR"

print_status "Copying built files..."

# Copy main build files
cp -r css "$DEPLOY_DIR/" 2>/dev/null || true
cp -r images "$DEPLOY_DIR/" 2>/dev/null || true
cp -r libs "$DEPLOY_DIR/" 2>/dev/null || true
cp -r fonts "$DEPLOY_DIR/" 2>/dev/null || true
cp -r sounds "$DEPLOY_DIR/" 2>/dev/null || true
cp -r lang "$DEPLOY_DIR/" 2>/dev/null || true
cp -r static "$DEPLOY_DIR/" 2>/dev/null || true

# Copy index files
cp index.html "$DEPLOY_DIR/" 2>/dev/null || true
cp *.html "$DEPLOY_DIR/" 2>/dev/null || true

# Copy JavaScript bundles
cp *.js "$DEPLOY_DIR/" 2>/dev/null || true
cp *.js.map "$DEPLOY_DIR/" 2>/dev/null || true

# Copy CSS files  
cp *.css "$DEPLOY_DIR/" 2>/dev/null || true

print_status "Creating tarball..."
cd /tmp
tar -czf rv2class-frontend.tar.gz -C "$DEPLOY_DIR" .

print_success "Deployment package created: /tmp/rv2class-frontend.tar.gz"

###############################################################################
# PART 5: Upload to Server
###############################################################################

print_header "PART 5: Uploading to Server"

print_status "Installing sshpass if needed..."
if ! command -v sshpass &> /dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y sshpass
fi

print_status "Uploading files to server..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no \
    /tmp/rv2class-frontend.tar.gz \
    $SERVER_USER@$SERVER_IP:/tmp/

print_success "Files uploaded"

###############################################################################
# PART 6: Deploy on Server
###############################################################################

print_header "PART 6: Deploying on Server"

print_status "Connecting to server and deploying..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no \
    $SERVER_USER@$SERVER_IP << 'DEPLOY_SCRIPT'

# Backup existing installation
echo "📦 Backing up existing files..."
sudo cp -r /usr/share/jitsi-meet /usr/share/jitsi-meet.backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

# Extract new files
echo "📁 Extracting new files..."
cd /usr/share/jitsi-meet
sudo tar -xzf /tmp/rv2class-frontend.tar.gz

# Set permissions
echo "🔒 Setting permissions..."
sudo chown -R www-data:www-data /usr/share/jitsi-meet
sudo chmod -R 755 /usr/share/jitsi-meet

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart jicofo
sudo systemctl restart jitsi-videobridge2

echo "✅ Deployment complete!"

DEPLOY_SCRIPT

print_success "Deployment completed on server"

###############################################################################
# PART 7: Cleanup
###############################################################################

print_header "PART 7: Cleanup"

print_status "Cleaning up temporary files..."
rm -rf "$DEPLOY_DIR"
rm -f /tmp/rv2class-frontend.tar.gz

print_success "Cleanup complete"

###############################################################################
# Summary
###############################################################################

print_header "DEPLOYMENT COMPLETE!"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT SUMMARY                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Your custom Jitsi Meet is now live at:"
echo "   https://$DOMAIN"
echo ""
echo "🎨 Custom Features Deployed:"
echo "   ✓ Teacher Authentication Page"
echo "   ✓ Student Welcome Portal"  
echo "   ✓ Homework System"
echo "   ✓ Permanent Teacher Rooms"
echo "   ✓ Custom UI/Styling"
echo "   ✓ Firebase Integration"
echo ""
echo "📝 Next Steps:"
echo "   1. Test teacher login: https://$DOMAIN"
echo "   2. Test student portal: https://$DOMAIN/static/student-welcome.html?studentId=TEST"
echo "   3. Configure Firebase (if not done)"
echo "   4. Add students via teacher dashboard"
echo ""
echo "🔍 Troubleshooting:"
echo "   SSH to server: ssh $SERVER_USER@$SERVER_IP"
echo "   Check logs: sudo tail -f /var/log/nginx/error.log"
echo "   Check Jitsi: sudo tail -f /var/log/jitsi/jvb.log"
echo ""
print_success "Frontend deployment successful!"
echo ""
