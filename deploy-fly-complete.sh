#!/bin/bash

# rv2class + Jitsi/BBB + Coturn - Fly.io Deployment Script
# Complete deployment with TURN/STUN server support

set -e  # Exit on error

echo "🚀 rv2class - Multi-Platform Video Deployment"
echo "=============================================="
echo "Supports: BigBlueButton + Jitsi Meet + Coturn TURN"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo -e "${RED}❌ Fly CLI not found!${NC}"
    echo ""
    echo "Installing Fly CLI..."
    curl -L https://fly.io/install.sh | sh
    echo ""
    echo -e "${YELLOW}⚠️  Please restart your terminal and run this script again${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Fly CLI installed${NC}"
echo ""

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Fly.io${NC}"
    echo "Opening browser for login..."
    fly auth login
    echo ""
fi

echo -e "${GREEN}✅ Logged in to Fly.io${NC}"
FLY_USER=$(fly auth whoami)
echo -e "   User: ${CYAN}${FLY_USER}${NC}"
echo ""

# Deployment options menu
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}   Deployment Options${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "1) Deploy Main App Only (Next.js + BBB + Jitsi)"
echo "2) Deploy Main App + Coturn TURN Server"
echo "3) Deploy Coturn Only"
echo "4) Configure Secrets & Environment"
echo "5) Check Deployment Status"
echo "6) View Logs"
echo "0) Exit"
echo ""
read -p "Select option: " option

case $option in
  1)
    echo ""
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo -e "${BLUE}   Deploying Main Application${NC}"
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo ""
    
    # Check for required secrets
    echo "Checking required secrets..."
    
    if ! fly secrets list --app rv2class 2>/dev/null | grep -q "BBB_URL"; then
        echo -e "${YELLOW}⚠️  BBB_URL not set${NC}"
        read -p "Enter BBB_URL (or press Enter to skip): " bbb_url
        if [ ! -z "$bbb_url" ]; then
            fly secrets set BBB_URL="$bbb_url" --app rv2class
        fi
    fi
    
    if ! fly secrets list --app rv2class 2>/dev/null | grep -q "BBB_SECRET"; then
        echo -e "${YELLOW}⚠️  BBB_SECRET not set${NC}"
        read -p "Enter BBB_SECRET (or press Enter to skip): " bbb_secret
        if [ ! -z "$bbb_secret" ]; then
            fly secrets set BBB_SECRET="$bbb_secret" --app rv2class
        fi
    fi
    
    echo ""
    echo "Building and deploying..."
    
    # Deploy main app
    fly deploy --config fly.toml --ha=false
    
    echo ""
    echo -e "${GREEN}✅ Main application deployed!${NC}"
    echo ""
    echo "Your app is available at: https://rv2class.fly.dev"
    echo ""
    echo "Platforms configured:"
    echo "  • BigBlueButton: $(fly secrets list --app rv2class 2>/dev/null | grep -q 'BBB_URL' && echo '✅' || echo '❌')"
    echo "  • Jitsi Meet: ✅ (uses meet.jit.si)"
    echo ""
    ;;
    
  2)
    echo ""
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo -e "${BLUE}   Deploying App + Coturn TURN${NC}"
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo ""
    
    echo -e "${CYAN}Note: Coturn on Fly.io has limitations:${NC}"
    echo "  • UDP relay port range (49152-65535) not fully supported"
    echo "  • Works for basic STUN, limited TURN functionality"
    echo "  • For production, consider: Twilio TURN or dedicated VPS"
    echo ""
    read -p "Continue with Fly.io Coturn? (y/n): " continue_coturn
    
    if [ "$continue_coturn" != "y" ]; then
        echo "Deployment cancelled."
        exit 0
    fi
    
    # Deploy main app first
    echo ""
    echo "Step 1: Deploying main application..."
    fly deploy --config fly.toml --ha=false
    
    echo ""
    echo "Step 2: Deploying Coturn TURN server..."
    
    # Check if coturn app exists
    if ! fly apps list | grep -q "rv2class-coturn"; then
        echo "Creating rv2class-coturn app..."
        fly apps create rv2class-coturn
    fi
    
    # Get external IP for Coturn
    echo "Getting Coturn external IP..."
    COTURN_IP=$(fly ips list --app rv2class-coturn 2>/dev/null | grep "v4" | awk '{print $3}' | head -1)
    
    if [ -z "$COTURN_IP" ]; then
        echo "Allocating IPv4 address for Coturn..."
        fly ips allocate-v4 --app rv2class-coturn
        COTURN_IP=$(fly ips list --app rv2class-coturn | grep "v4" | awk '{print $3}' | head -1)
    fi
    
    echo "Coturn IP: $COTURN_IP"
    
    # Set Coturn secrets
    echo "Setting Coturn credentials..."
    read -p "Set TURN username (default: rvclass): " turn_user
    turn_user=${turn_user:-rvclass}
    
    read -sp "Set TURN password (default: rvclasspass2024): " turn_pass
    echo ""
    turn_pass=${turn_pass:-rvclasspass2024}
    
    fly secrets set TURN_USER="$turn_user" TURN_PASS="$turn_pass" EXTERNAL_IP="$COTURN_IP" --app rv2class-coturn
    
    # Deploy Coturn
    fly deploy --config fly-coturn.toml --app rv2class-coturn --ha=false
    
    echo ""
    echo -e "${GREEN}✅ Full stack deployed!${NC}"
    echo ""
    echo "Services:"
    echo "  • Main App: https://rv2class.fly.dev"
    echo "  • Coturn TURN: $COTURN_IP:3478"
    echo ""
    echo "TURN Credentials:"
    echo "  • Username: $turn_user"
    echo "  • Password: $turn_pass"
    echo "  • URLs: turn:$COTURN_IP:3478"
    echo ""
    echo -e "${YELLOW}⚠️  Update Jitsi config to use your TURN server${NC}"
    echo "Edit components/JitsiRoom.tsx and add:"
    echo "  configOverwrite: {"
    echo "    p2p: { stunServers: [{ urls: 'stun:$COTURN_IP:3478' }] },"
    echo "  }"
    echo ""
    ;;
    
  3)
    echo ""
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo -e "${BLUE}   Deploying Coturn Only${NC}"
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo ""
    
    # Check if coturn app exists
    if ! fly apps list | grep -q "rv2class-coturn"; then
        echo "Creating rv2class-coturn app..."
        fly apps create rv2class-coturn
    fi
    
    fly deploy --config fly-coturn.toml --app rv2class-coturn --ha=false
    
    echo ""
    echo -e "${GREEN}✅ Coturn deployed!${NC}"
    ;;
    
  4)
    echo ""
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo -e "${BLUE}   Configure Secrets${NC}"
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo ""
    
    echo "Select app:"
    echo "1) rv2class (main app)"
    echo "2) rv2class-coturn (TURN server)"
    read -p "Select: " app_choice
    
    if [ "$app_choice" = "1" ]; then
        APP_NAME="rv2class"
        echo ""
        echo "Available secrets for main app:"
        echo "  • BBB_URL - BigBlueButton server URL"
        echo "  • BBB_SECRET - BigBlueButton shared secret"
        echo ""
        
        read -p "Set BBB_URL? (y/n): " set_bbb_url
        if [ "$set_bbb_url" = "y" ]; then
            read -p "Enter BBB_URL: " bbb_url
            fly secrets set BBB_URL="$bbb_url" --app $APP_NAME
        fi
        
        read -p "Set BBB_SECRET? (y/n): " set_bbb_secret
        if [ "$set_bbb_secret" = "y" ]; then
            read -sp "Enter BBB_SECRET: " bbb_secret
            echo ""
            fly secrets set BBB_SECRET="$bbb_secret" --app $APP_NAME
        fi
    else
        APP_NAME="rv2class-coturn"
        echo ""
        echo "Available secrets for Coturn:"
        echo "  • TURN_USER - TURN server username"
        echo "  • TURN_PASS - TURN server password"
        echo ""
        
        read -p "Set TURN credentials? (y/n): " set_turn
        if [ "$set_turn" = "y" ]; then
            read -p "Enter TURN_USER: " turn_user
            read -sp "Enter TURN_PASS: " turn_pass
            echo ""
            fly secrets set TURN_USER="$turn_user" TURN_PASS="$turn_pass" --app $APP_NAME
        fi
    fi
    
    echo ""
    echo -e "${GREEN}✅ Secrets configured!${NC}"
    ;;
    
  5)
    echo ""
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo -e "${BLUE}   Deployment Status${NC}"
    echo -e "${BLUE}══════════════════════════════════════${NC}"
    echo ""
    
    echo "Main App Status:"
    fly status --app rv2class 2>/dev/null || echo "  ❌ Not deployed"
    
    echo ""
    echo "Coturn Status:"
    fly status --app rv2class-coturn 2>/dev/null || echo "  ❌ Not deployed"
    
    echo ""
    echo "URLs:"
    echo "  • Main: https://rv2class.fly.dev"
    fly ips list --app rv2class-coturn 2>/dev/null | grep "v4" && echo "  • Coturn: $(fly ips list --app rv2class-coturn | grep 'v4' | awk '{print $3}' | head -1):3478"
    ;;
    
  6)
    echo ""
    echo "Select app:"
    echo "1) rv2class (main app)"
    echo "2) rv2class-coturn (TURN server)"
    read -p "Select: " log_choice
    
    if [ "$log_choice" = "1" ]; then
        fly logs --app rv2class
    else
        fly logs --app rv2class-coturn
    fi
    ;;
    
  0)
    echo "Goodbye!"
    exit 0
    ;;
    
  *)
    echo -e "${RED}Invalid option${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment Complete! 🎉${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Quick commands:"
echo "  • Check status: fly status --app rv2class"
echo "  • View logs: fly logs --app rv2class"
echo "  • Open app: fly open --app rv2class"
echo "  • Scale: fly scale count 1 --app rv2class"
echo ""
echo "Documentation:"
echo "  • See FLY_DEPLOYMENT_GUIDE.md for details"
echo "  • See JITSI_INTEGRATION_GUIDE.md for Jitsi config"
echo ""
