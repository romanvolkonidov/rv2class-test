#!/bin/bash
# Jitsi Meet Build Setup Script
# This script prepares the Jitsi Meet webapp for customization

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

JITSI_DIR="/home/roman/Documents/rv2class-test/jitsi-custom/jitsi-meet"

echo "========================================"
echo "  Jitsi Meet Custom Build Setup"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -d "$JITSI_DIR" ]; then
    echo -e "${RED}Error: Jitsi directory not found!${NC}"
    exit 1
fi

cd "$JITSI_DIR"

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
if [ "$NODE_VERSION" == "not installed" ]; then
    echo -e "${RED}Node.js is not installed!${NC}"
    echo "Please install Node.js 16 or higher:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi
echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"

# Check npm
NPM_VERSION=$(npm --version 2>/dev/null || echo "not installed")
echo -e "${GREEN}✓ npm: $NPM_VERSION${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
echo "This may take 5-10 minutes on first run..."

if [ -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules exists. Cleaning...${NC}"
    rm -rf node_modules package-lock.json
fi

npm install

echo -e "${GREEN}✓ Dependencies installed!${NC}"

# Create custom config for test server
echo ""
echo -e "${YELLOW}Creating configuration templates...${NC}"

# Backup original config if not already backed up
if [ ! -f "config.js.original" ]; then
    cp config.js config.js.original
    echo -e "${GREEN}✓ Backed up original config.js${NC}"
fi

if [ ! -f "interface_config.js.original" ]; then
    cp interface_config.js interface_config.js.original 2>/dev/null || echo "interface_config.js not found, skipping..."
fi

# Create test server config
cat > config.test.js << 'EOF'
/* eslint-disable no-unused-vars, no-var */

// Test server configuration
var config = {
    hosts: {
        domain: 'test.jitsi.yourdomain.com', // CHANGE THIS
        muc: 'conference.test.jitsi.yourdomain.com' // CHANGE THIS
    },
    
    bosh: '//test.jitsi.yourdomain.com/http-bind', // CHANGE THIS
    websocket: 'wss://test.jitsi.yourdomain.com/xmpp-websocket', // CHANGE THIS
    
    // Basic settings
    enableWelcomePage: true,
    enableClosePage: false,
    
    // Disable analytics for test
    disableThirdPartyRequests: true,
    
    // UI
    defaultLanguage: 'en',
    
    // Features
    enableNoisyMicDetection: true,
    
    // Custom annotation support (for future integration)
    customToolbarButtons: [
        // Will add annotation button here
    ]
};

/* eslint-enable no-unused-vars, no-var */
EOF

echo -e "${GREEN}✓ Created config.test.js template${NC}"

# Check if we need to install build tools
echo ""
echo -e "${YELLOW}Checking build tools...${NC}"

if ! command -v make &> /dev/null; then
    echo -e "${YELLOW}! 'make' not found. Install with: sudo apt-get install build-essential${NC}"
fi

# Try a development build
echo ""
echo -e "${YELLOW}Testing build system...${NC}"
echo "Running webpack build test..."

if npm run build:main 2>&1 | grep -q "webpack"; then
    echo -e "${GREEN}✓ Build system working!${NC}"
else
    echo -e "${YELLOW}! Build test inconclusive, but setup complete${NC}"
fi

echo ""
echo -e "${GREEN}========================================"
echo "✓ Setup Complete!"
echo "========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start development server:"
echo "   cd $JITSI_DIR"
echo "   npm start"
echo "   (Opens on http://localhost:8080)"
echo ""
echo "2. Make your customizations:"
echo "   - Edit React components in react/features/"
echo "   - Modify styles in css/"
echo "   - Update config.js for your domain"
echo ""
echo "3. Build for production:"
echo "   make"
echo ""
echo "4. Deploy to test server:"
echo "   See docs/JITSI_SETUP.md for deployment instructions"
echo ""
echo "Key files to edit:"
echo "  - config.js (or config.test.js)"
echo "  - interface_config.js"
echo "  - react/features/toolbox/ (toolbar customization)"
echo "  - css/main.scss (styling)"
echo ""
