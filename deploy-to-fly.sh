#!/bin/bash

# BBB + Fly.io Deployment Script
# Quick deployment helper

set -e  # Exit on error

echo "🚀 rv2class - BBB Migration Deployment Script"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
echo ""

# Check if BBB credentials are provided
echo -e "${BLUE}Step 1: BBB Server Configuration${NC}"
echo "================================"
echo ""

if [ -z "$BBB_URL" ] || [ -z "$BBB_SECRET" ]; then
    echo -e "${YELLOW}⚠️  BBB credentials not set${NC}"
    echo ""
    echo "You need to set BBB_URL and BBB_SECRET before deploying."
    echo ""
    echo "Option 1: Set them now as environment variables:"
    echo "  export BBB_URL='https://your-bbb-server.com/bigbluebutton/'"
    echo "  export BBB_SECRET='your_secret'"
    echo "  ./deploy-to-fly.sh"
    echo ""
    echo "Option 2: Use fly secrets directly:"
    echo "  fly secrets set BBB_URL='https://your-bbb-server.com/bigbluebutton/'"
    echo "  fly secrets set BBB_SECRET='your_secret'"
    echo "  fly deploy"
    echo ""
    read -p "Do you have BBB credentials ready? (y/n): " has_creds
    
    if [ "$has_creds" != "y" ]; then
        echo ""
        echo -e "${YELLOW}📖 See DEPLOYMENT_COMPLETE_GUIDE.md for BBB setup instructions${NC}"
        echo ""
        echo "Quick options:"
        echo "  A) Hosted BBB: https://blindsidenetworks.com (~\$100/month)"
        echo "  B) Self-host on DigitalOcean (~\$40/month)"
        exit 0
    fi
    
    echo ""
    read -p "Enter BBB_URL: " bbb_url
    read -p "Enter BBB_SECRET: " bbb_secret
    
    BBB_URL="$bbb_url"
    BBB_SECRET="$bbb_secret"
fi

echo -e "${GREEN}✅ BBB credentials provided${NC}"
echo ""

# Check if app exists
echo -e "${BLUE}Step 2: Fly.io App Setup${NC}"
echo "======================="
echo ""

if ! fly apps list | grep -q "rv2class"; then
    echo -e "${YELLOW}⚠️  App 'rv2class' doesn't exist yet${NC}"
    read -p "Create app 'rv2class'? (y/n): " create_app
    
    if [ "$create_app" = "y" ]; then
        echo "Creating app..."
        fly apps create rv2class
        echo -e "${GREEN}✅ App created${NC}"
    else
        echo -e "${RED}❌ Cannot deploy without app${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ App 'rv2class' exists${NC}"
fi
echo ""

# Set secrets
echo -e "${BLUE}Step 3: Setting BBB Secrets${NC}"
echo "==========================="
echo ""

echo "Setting BBB_URL..."
fly secrets set BBB_URL="$BBB_URL" --app rv2class

echo "Setting BBB_SECRET..."
fly secrets set BBB_SECRET="$BBB_SECRET" --app rv2class

echo -e "${GREEN}✅ Secrets configured${NC}"
echo ""

# Deploy
echo -e "${BLUE}Step 4: Deploying to Fly.io${NC}"
echo "============================"
echo ""

echo "Starting deployment..."
fly deploy --app rv2class

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Show info
echo -e "${BLUE}📊 Deployment Info${NC}"
echo "================="
fly info --app rv2class

echo ""
echo -e "${GREEN}🎉 Success!${NC}"
echo ""
echo "Your app is now live at:"
echo "  https://rv2class.fly.dev"
echo ""
echo "Test it:"
echo "  https://rv2class.fly.dev/room?room=test&name=Teacher&tutor=true"
echo ""
echo "View logs:"
echo "  fly logs --app rv2class"
echo ""
echo "All your existing student links will now use BBB!"
echo "No changes needed for students. 🎊"
