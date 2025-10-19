#!/bin/bash

# ============================================
# Setup Automatic Nightly Deployment
# Configures cron to deploy at night
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Setup Automatic Nightly Deployment                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get the absolute path to the deployment script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-to-production.sh"
LOG_FILE="$SCRIPT_DIR/deployment.log"

echo "Deployment script: $DEPLOY_SCRIPT"
echo "Log file: $LOG_FILE"
echo ""

# Make sure deployment script is executable
chmod +x "$DEPLOY_SCRIPT"

echo "Choose deployment time (your local time):"
echo "  1. 2:00 AM (recommended - low traffic)"
echo "  2. 3:00 AM"
echo "  3. 4:00 AM"
echo "  4. Custom time"
echo ""
read -p "Enter choice (1-4): " TIME_CHOICE

case $TIME_CHOICE in
    1)
        CRON_TIME="0 2 * * *"
        TIME_DESC="2:00 AM every day"
        ;;
    2)
        CRON_TIME="0 3 * * *"
        TIME_DESC="3:00 AM every day"
        ;;
    3)
        CRON_TIME="0 4 * * *"
        TIME_DESC="4:00 AM every day"
        ;;
    4)
        read -p "Enter hour (0-23): " HOUR
        CRON_TIME="0 $HOUR * * *"
        TIME_DESC="$HOUR:00 every day"
        ;;
    *)
        echo "Invalid choice. Using 2:00 AM"
        CRON_TIME="0 2 * * *"
        TIME_DESC="2:00 AM every day"
        ;;
esac

echo ""
echo -e "${YELLOW}Creating cron job...${NC}"

# Create a cron job entry
CRON_JOB="$CRON_TIME cd $SCRIPT_DIR && $DEPLOY_SCRIPT >> $LOG_FILE 2>&1"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -v "deploy-to-production.sh"; echo "$CRON_JOB") | crontab -

echo -e "${GREEN}✓${NC} Cron job created!"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete! ✓                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Automatic deployment scheduled for: ${BLUE}$TIME_DESC${NC}"
echo ""
echo "Your changes will be automatically:"
echo "  1. Committed to git"
echo "  2. Pushed to GitHub"
echo "  3. Pulled on the production server"
echo "  4. Built and restarted"
echo ""
echo "Useful commands:"
echo "  • View cron jobs:    crontab -l"
echo "  • Remove cron job:   crontab -e  (then delete the line)"
echo "  • View deploy logs:  tail -f $LOG_FILE"
echo "  • Manual deploy:     $DEPLOY_SCRIPT"
echo ""
echo -e "${YELLOW}Note:${NC} The computer must be on for cron to run!"
echo "Alternative: Use GitHub Actions for cloud-based automation"
echo ""
