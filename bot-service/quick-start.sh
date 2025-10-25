#!/bin/bash

# Quick Start Script for Local Testing
# This script helps you set up and test the bot service quickly

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Jitsi Bot Service - Quick Start                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    echo ""
    echo "Creating .env from template..."
    cp .env.example .env
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Update .env with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    else
        # Linux
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    fi
    
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  You need to fill in Firebase credentials in .env${NC}"
    echo ""
    echo "Required values:"
    echo "  - FIREBASE_PROJECT_ID"
    echo "  - FIREBASE_PRIVATE_KEY"
    echo "  - FIREBASE_CLIENT_EMAIL"
    echo ""
    read -p "Press Enter to open .env for editing..."
    ${EDITOR:-nano} .env
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Check environment variables
echo -e "\n${BLUE}🔍 Checking configuration...${NC}"

source .env

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ JWT_SECRET not set!${NC}"
    exit 1
fi

if [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo -e "${RED}❌ FIREBASE_PROJECT_ID not set!${NC}"
    exit 1
fi

if [ -z "$FIREBASE_PRIVATE_KEY" ]; then
    echo -e "${RED}❌ FIREBASE_PRIVATE_KEY not set!${NC}"
    exit 1
fi

if [ -z "$FIREBASE_CLIENT_EMAIL" ]; then
    echo -e "${RED}❌ FIREBASE_CLIENT_EMAIL not set!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuration valid${NC}"

# Create logs directory
mkdir -p logs

# Show menu
echo -e "\n${BLUE}What would you like to do?${NC}"
echo ""
echo "1) Start bot service (dev mode)"
echo "2) Start bot service (PM2 production mode)"
echo "3) Run tests"
echo "4) Check service health"
echo "5) View logs"
echo "6) Stop services"
echo "7) Exit"
echo ""
read -p "Enter choice [1-7]: " choice

case $choice in
    1)
        echo -e "\n${GREEN}🚀 Starting bot service in development mode...${NC}"
        echo ""
        echo "Bot Management API will be at: http://localhost:3001"
        echo "JWT API will be at: http://localhost:3002"
        echo ""
        echo "Press Ctrl+C to stop"
        echo ""
        npm run dev
        ;;
    
    2)
        echo -e "\n${GREEN}🚀 Starting bot service with PM2...${NC}"
        
        if ! command -v pm2 &> /dev/null; then
            echo -e "${YELLOW}Installing PM2...${NC}"
            npm install -g pm2
        fi
        
        npm run pm2:start
        echo ""
        echo -e "${GREEN}✅ Service started!${NC}"
        echo ""
        echo "Useful commands:"
        echo "  View status:  pm2 status"
        echo "  View logs:    pm2 logs jitsi-bot-service"
        echo "  Restart:      pm2 restart jitsi-bot-service"
        echo "  Stop:         pm2 stop jitsi-bot-service"
        ;;
    
    3)
        echo -e "\n${BLUE}🧪 Running tests...${NC}"
        echo ""
        
        # Start service in background
        npm run dev &
        SERVICE_PID=$!
        
        # Wait for service to start
        echo "Waiting for services to start..."
        sleep 5
        
        # Run tests
        echo -e "\n${BLUE}Test 1: Bot Service Health${NC}"
        curl -s http://localhost:3001/health | jq || echo "Failed"
        
        echo -e "\n${BLUE}Test 2: JWT API Health${NC}"
        curl -s http://localhost:3002/api/health | jq || echo "Failed"
        
        echo -e "\n${BLUE}Test 3: List Active Bots${NC}"
        curl -s http://localhost:3001/bots | jq || echo "Failed"
        
        # Stop service
        kill $SERVICE_PID
        
        echo -e "\n${GREEN}Tests complete!${NC}"
        echo "For detailed testing, see TESTING_GUIDE.md"
        ;;
    
    4)
        echo -e "\n${BLUE}🏥 Checking service health...${NC}"
        echo ""
        
        echo "Bot Service:"
        curl -s http://localhost:3001/health | jq || echo -e "${RED}❌ Not running${NC}"
        
        echo ""
        echo "JWT API:"
        curl -s http://localhost:3002/api/health | jq || echo -e "${RED}❌ Not running${NC}"
        
        echo ""
        echo "Active Bots:"
        curl -s http://localhost:3001/bots | jq || echo -e "${RED}❌ Service not running${NC}"
        ;;
    
    5)
        echo -e "\n${BLUE}📋 Recent logs:${NC}"
        echo ""
        
        if command -v pm2 &> /dev/null && pm2 list | grep -q "jitsi-bot-service"; then
            pm2 logs jitsi-bot-service --lines 50 --nostream
        elif [ -f "logs/out.log" ]; then
            tail -50 logs/out.log
        else
            echo "No logs found. Service not started yet."
        fi
        ;;
    
    6)
        echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
        
        if command -v pm2 &> /dev/null && pm2 list | grep -q "jitsi-bot-service"; then
            pm2 stop jitsi-bot-service
            pm2 delete jitsi-bot-service
            echo -e "${GREEN}✅ PM2 service stopped${NC}"
        else
            echo "No PM2 service running"
        fi
        
        # Kill any node processes on our ports
        lsof -ti:3001 | xargs kill -9 2>/dev/null || true
        lsof -ti:3002 | xargs kill -9 2>/dev/null || true
        
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
    
    7)
        echo -e "${GREEN}👋 Goodbye!${NC}"
        exit 0
        ;;
    
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
