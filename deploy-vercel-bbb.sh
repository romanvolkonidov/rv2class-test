#!/bin/bash

# BBB Budget Deployment Script for rv2class
# Deploys to Vercel with BBB backend

set -e

echo "🎓 rv2class - BBB Budget Deployment"
echo "===================================="
echo ""
echo "This will deploy your frontend to Vercel with BBB backend"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm i -g vercel
fi

echo -e "${GREEN}✅ Vercel CLI ready${NC}"
echo ""

# Get BBB credentials
echo -e "${BLUE}Step 1: BBB Server Information${NC}"
echo "==============================="
echo ""

if [ -z "$BBB_URL" ] || [ -z "$BBB_SECRET" ]; then
    echo -e "${YELLOW}⚠️  BBB credentials needed${NC}"
    echo ""
    echo "First, you need a BBB server. Cheapest options:"
    echo "  1. Hetzner Cloud CPX21 (4GB RAM): €5.83/month"
    echo "  2. Contabo VPS S (4GB RAM): \$6.99/month"
    echo ""
    echo "Setup BBB server:"
    echo "  1. Create server (Hetzner recommended)"
    echo "  2. Point DNS: bbb.rv2class.com → server IP"
    echo "  3. SSH and run:"
    echo "     wget -qO- https://ubuntu.bigbluebutton.org/bbb-install-2.7.sh | \\"
    echo "       bash -s -- -w -v focal-270 -s bbb.rv2class.com -e your@email.com"
    echo "  4. Get credentials: bbb-conf --secret"
    echo ""
    read -p "Do you have BBB server ready? (y/n): " has_server
    
    if [ "$has_server" != "y" ]; then
        echo ""
        echo -e "${YELLOW}📖 See BBB_BUDGET_DEPLOYMENT.md for detailed setup${NC}"
        exit 0
    fi
    
    echo ""
    read -p "Enter BBB_URL (https://bbb.rv2class.com/bigbluebutton/): " bbb_url
    read -p "Enter BBB_SECRET: " bbb_secret
    
    BBB_URL="$bbb_url"
    BBB_SECRET="$bbb_secret"
fi

echo -e "${GREEN}✅ BBB credentials provided${NC}"
echo ""

# Login to Vercel
echo -e "${BLUE}Step 2: Vercel Login${NC}"
echo "===================="
echo ""

if ! vercel whoami &> /dev/null; then
    echo "Logging in to Vercel..."
    vercel login
else
    echo -e "${GREEN}✅ Already logged in to Vercel${NC}"
fi
echo ""

# Set environment variables
echo -e "${BLUE}Step 3: Setting Environment Variables${NC}"
echo "======================================"
echo ""

echo "Setting BBB_URL..."
vercel env add BBB_URL production <<< "$BBB_URL"

echo "Setting BBB_SECRET..."
vercel env add BBB_SECRET production <<< "$BBB_SECRET"

echo -e "${GREEN}✅ Environment variables configured${NC}"
echo ""

# Deploy
echo -e "${BLUE}Step 4: Deploying to Vercel${NC}"
echo "============================"
echo ""

echo "Building and deploying..."
vercel --prod

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Show success message
echo -e "${BLUE}🎉 Success!${NC}"
echo "=========="
echo ""
echo "Your app is live at:"
echo "  https://online.rv2class.com"
echo ""
echo "Test a room:"
echo "  https://online.rv2class.com/room?room=test&name=Teacher&tutor=true"
echo ""
echo "All existing student links now use BBB!"
echo ""
echo "💰 Monthly cost: ~\$6-7 (Hetzner VPS)"
echo ""
echo -e "${GREEN}Your students will love the stability! 🎊${NC}"
