#!/bin/bash

# BigBlueButton Migration Quick Start Script
# This script helps you prepare for BBB migration

echo "🎯 BigBlueButton Migration Quick Start"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check if .env.local exists
echo -e "${BLUE}Step 1: Checking environment configuration...${NC}"
if [ -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
    echo "   Checking for BBB configuration..."
    if grep -q "BBB_URL" .env.local && grep -q "BBB_SECRET" .env.local; then
        echo -e "${GREEN}✅ BBB configuration found!${NC}"
    else
        echo -e "${RED}❌ BBB configuration missing in .env.local${NC}"
        echo "   Please add BBB_URL and BBB_SECRET to .env.local"
    fi
else
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo "   Creating from template..."
    cp .env.bbb.example .env.local
    echo -e "${GREEN}✅ Created .env.local from template${NC}"
    echo -e "${YELLOW}   👉 YOU MUST EDIT .env.local WITH YOUR BBB CREDENTIALS!${NC}"
fi
echo ""

# Step 2: Check for LiveKit dependencies
echo -e "${BLUE}Step 2: Checking for LiveKit dependencies...${NC}"
if grep -q "livekit" package.json; then
    echo -e "${YELLOW}⚠️  LiveKit dependencies still in package.json${NC}"
    echo "   This is expected if you haven't run 'npm install' yet"
else
    echo -e "${GREEN}✅ No LiveKit dependencies found${NC}"
fi
echo ""

# Step 3: Check Node.js version
echo -e "${BLUE}Step 3: Checking Node.js version...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✅ Node.js version is compatible: $(node -v)${NC}"
else
    echo -e "${RED}❌ Node.js version too old: $(node -v)${NC}"
    echo "   BBB integration requires Node.js 18 or higher"
fi
echo ""

# Step 4: Check if npm dependencies are installed
echo -e "${BLUE}Step 4: Checking npm dependencies...${NC}"
if [ -d node_modules ]; then
    echo -e "${GREEN}✅ node_modules directory exists${NC}"
    echo "   Run 'npm install' to update dependencies"
else
    echo -e "${YELLOW}⚠️  node_modules not found${NC}"
    echo "   Run 'npm install' to install dependencies"
fi
echo ""

# Step 5: Find LiveKit references
echo -e "${BLUE}Step 5: Finding LiveKit references in code...${NC}"
LIVEKIT_REFS=$(grep -r "LiveKitRoom\|livekit-token\|@livekit" app/ components/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
if [ "$LIVEKIT_REFS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $LIVEKIT_REFS LiveKit references${NC}"
    echo "   These files still reference LiveKit:"
    grep -r "LiveKitRoom\|livekit-token\|@livekit" app/ components/ --include="*.tsx" --include="*.ts" -l 2>/dev/null | head -5
    echo "   You'll need to update these to use BBB"
else
    echo -e "${GREEN}✅ No LiveKit references found${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}======================================"
echo "📋 Summary & Next Steps"
echo -e "======================================${NC}"
echo ""

echo "✅ Completed:"
echo "   - BBB backend library created (lib/bbb.ts)"
echo "   - BBB API endpoints created (app/api/bbb-*)"
echo "   - BBB frontend component created (components/BBBRoom.tsx)"
echo "   - BBB room page created (app/bbb-room/page.tsx)"
echo "   - Documentation created (BBB_*.md files)"
echo ""

echo "🚧 YOU MUST DO:"
echo ""
echo -e "${YELLOW}1. Set up BigBlueButton server:${NC}"
echo "   Option A: Production server (Ubuntu)"
echo "   Option B: Use hosted service (easiest)"
echo "   Option C: Docker for testing"
echo "   "
echo "   📖 See BBB_SETUP_GUIDE.md for instructions"
echo ""

echo -e "${YELLOW}2. Configure environment:${NC}"
echo "   Edit .env.local with your BBB credentials:"
echo "   $ nano .env.local"
echo ""

echo -e "${YELLOW}3. Install updated dependencies:${NC}"
echo "   $ npm install"
echo ""

echo -e "${YELLOW}4. Update room links in your code:${NC}"
echo "   Change '/room' to '/bbb-room' in:"
echo "   - Tutor dashboard"
echo "   - Student join links"
echo "   - Navigation components"
echo ""

echo -e "${YELLOW}5. Test the integration:${NC}"
echo "   $ npm run dev"
echo "   Visit: http://localhost:3000/bbb-room?room=test&name=You&tutor=true"
echo ""

echo "📚 Documentation:"
echo "   - BBB_MIGRATION_SUMMARY.md  - Overview of changes"
echo "   - BBB_SETUP_GUIDE.md        - Detailed setup steps"
echo "   - BBB_MIGRATION_PLAN.md     - Full migration strategy"
echo ""

echo -e "${GREEN}🎉 You're ready to migrate to BigBlueButton!${NC}"
echo "   No more joining issues! 💪"
echo ""
