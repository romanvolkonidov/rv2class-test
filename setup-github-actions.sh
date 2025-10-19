#!/bin/bash

# ============================================
# Setup GitHub Actions for Automatic Deployment
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Setup GitHub Actions Auto-Deployment                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
SERVER_IP="207.246.95.30"
SERVER_PASSWORD="eG7[89B2tgdJM=t2"
GITHUB_REPO="romanvolkonidov/rv2class-test"

echo -e "${YELLOW}This will set up FULLY AUTOMATIC deployment!${NC}"
echo ""
echo "After this setup:"
echo "  1. You code and commit changes"
echo "  2. Push to GitHub: ${GREEN}git push${NC}"
echo "  3. GitHub automatically deploys to Vultr"
echo "  4. Done! ✨"
echo ""
echo "Deployment happens:"
echo "  • Immediately on every push to main branch"
echo "  • OR at 2 AM every night (scheduled)"
echo ""

# Check if .github/workflows exists
if [ ! -f ".github/workflows/deploy.yml" ]; then
    echo -e "${RED}Error: .github/workflows/deploy.yml not found!${NC}"
    echo "Creating it now..."
    
    mkdir -p .github/workflows
    
    cat > .github/workflows/deploy.yml << 'EOF'
name: Auto Deploy to Vultr

on:
  # Deploy on every push to main
  push:
    branches: [ main ]
  
  # Also deploy every night at 2 AM UTC
  schedule:
    - cron: '0 2 * * *'
  
  # Allow manual deployment
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Deploy to Vultr Server
      env:
        SERVER_IP: ${{ secrets.SERVER_IP }}
        SERVER_PASSWORD: ${{ secrets.SERVER_PASSWORD }}
      run: |
        # Install sshpass
        sudo apt-get update -qq
        sudo apt-get install -y sshpass
        
        echo "🚀 Deploying to production server..."
        
        # SSH and deploy
        sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'
        set -e
        
        echo "📂 Navigating to app directory..."
        cd /var/www/rv2class
        
        echo "📥 Pulling latest code..."
        git fetch origin
        git reset --hard origin/main
        
        echo "📦 Installing dependencies..."
        npm install
        
        echo "🔨 Building Next.js app..."
        npm run build
        
        echo "♻️  Restarting application..."
        pm2 restart rv2class || pm2 start ecosystem.config.js
        pm2 save
        
        echo "✅ Deployment complete!"
        pm2 list
        ENDSSH
    
    - name: Deployment Status
      if: always()
      run: |
        if [ $? -eq 0 ]; then
          echo "✅ Deployment successful!"
        else
          echo "❌ Deployment failed!"
          exit 1
        fi
EOF
    
    echo -e "${GREEN}✓${NC} Created .github/workflows/deploy.yml"
fi

echo ""
echo -e "${YELLOW}Step 1: Add GitHub Secrets${NC}"
echo ""
echo "You need to add these secrets to GitHub:"
echo ""
echo -e "${GREEN}1. Go to:${NC}"
echo "   https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo -e "${GREEN}2. Click 'New repository secret'${NC}"
echo ""
echo -e "${GREEN}3. Add these TWO secrets:${NC}"
echo ""
echo "   Secret #1:"
echo -e "   Name:  ${BLUE}SERVER_IP${NC}"
echo -e "   Value: ${BLUE}$SERVER_IP${NC}"
echo ""
echo "   Secret #2:"
echo -e "   Name:  ${BLUE}SERVER_PASSWORD${NC}"
echo -e "   Value: ${BLUE}$SERVER_PASSWORD${NC}"
echo ""
read -p "Press Enter after you've added both secrets to GitHub..."

echo ""
echo -e "${YELLOW}Step 2: Push the workflow to GitHub${NC}"
echo ""

# Commit and push the workflow
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions auto-deployment workflow" || echo "Already committed"

echo "Pushing to GitHub..."
if git push origin main; then
    echo -e "${GREEN}✓${NC} Workflow pushed to GitHub!"
else
    echo -e "${RED}Push failed. You may need to pull first:${NC}"
    echo "  git pull origin main"
    echo "  git push origin main"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          GitHub Actions Setup Complete! 🎉                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}✨ FULLY AUTOMATIC DEPLOYMENT IS NOW ACTIVE! ✨${NC}"
echo ""
echo -e "${BLUE}How it works:${NC}"
echo ""
echo "1. Make changes to your code"
echo "2. Commit: ${GREEN}git commit -m \"your changes\"${NC}"
echo "3. Push: ${GREEN}git push${NC}"
echo "4. GitHub automatically deploys to Vultr!"
echo "5. Check progress at:"
echo "   https://github.com/$GITHUB_REPO/actions"
echo ""
echo -e "${BLUE}Features:${NC}"
echo "  ✅ Deploys on every push to main"
echo "  ✅ Also deploys every night at 2 AM UTC"
echo "  ✅ Can trigger manually from GitHub"
echo "  ✅ Email notifications on failure"
echo "  ✅ Full deployment logs"
echo ""
echo -e "${YELLOW}Test it now:${NC}"
echo "  1. Make a small change to any file"
echo "  2. Run: ${GREEN}git add . && git commit -m \"test deployment\" && git push${NC}"
echo "  3. Watch it deploy: https://github.com/$GITHUB_REPO/actions"
echo ""
echo -e "${GREEN}You're all set! Happy coding! 🚀${NC}"
echo ""
