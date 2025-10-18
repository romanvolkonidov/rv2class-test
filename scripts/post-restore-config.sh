#!/bin/bash

# Post-Restore Configuration Script
# Run this ON THE TEST SERVER after restoring from production snapshot
# This will reconfigure the server for test environment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================================"
echo "   Post-Restore Configuration for Test Server"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Get configuration from user
echo "Please provide the following information:"
echo ""
read -p "Test server hostname (e.g., jitsi-test.yourdomain.com): " TEST_HOSTNAME
read -p "Test server IP address (e.g., 45.63.0.93): " TEST_IP

if [ -z "$TEST_HOSTNAME" ] || [ -z "$TEST_IP" ]; then
    echo -e "${RED}Hostname and IP are required!${NC}"
    exit 1
fi

echo ""
echo "Configuration:"
echo "  Hostname: $TEST_HOSTNAME"
echo "  IP: $TEST_IP"
echo ""
read -p "Is this correct? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborting."
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting configuration...${NC}"

# 1. Update hostname
echo -e "${YELLOW}1. Updating hostname...${NC}"
hostnamectl set-hostname "$TEST_HOSTNAME"
echo "$TEST_HOSTNAME" > /etc/hostname

# Update /etc/hosts
sed -i.bak "s/^127\.0\.1\.1.*/127.0.1.1\t$TEST_HOSTNAME/" /etc/hosts
echo -e "${GREEN}✓ Hostname updated${NC}"

# 2. Update Jitsi Meet configuration
echo -e "${YELLOW}2. Updating Jitsi Meet configuration...${NC}"

# Update meet config.js
if [ -f /etc/jitsi/meet/*-config.js ]; then
    OLD_CONFIG=$(ls /etc/jitsi/meet/*-config.js | head -1)
    OLD_DOMAIN=$(basename "$OLD_CONFIG" -config.js)
    
    # Create new config file
    cp "$OLD_CONFIG" "/etc/jitsi/meet/${TEST_HOSTNAME}-config.js"
    
    # Update domain references in the new config
    sed -i "s/${OLD_DOMAIN}/${TEST_HOSTNAME}/g" "/etc/jitsi/meet/${TEST_HOSTNAME}-config.js"
    
    echo -e "${GREEN}✓ Meet config updated${NC}"
else
    echo -e "${YELLOW}! No meet config found, skipping${NC}"
fi

# 3. Update Jicofo configuration
echo -e "${YELLOW}3. Updating Jicofo configuration...${NC}"
if [ -f /etc/jitsi/jicofo/jicofo.conf ]; then
    sed -i.bak "s/hocon.hostname = .*/hocon.hostname = \"$TEST_HOSTNAME\"/" /etc/jitsi/jicofo/jicofo.conf
    echo -e "${GREEN}✓ Jicofo config updated${NC}"
fi

# 4. Update JVB configuration
echo -e "${YELLOW}4. Updating JVB configuration...${NC}"
if [ -f /etc/jitsi/videobridge/jvb.conf ]; then
    sed -i.bak "s/hocon.hostname = .*/hocon.hostname = \"$TEST_HOSTNAME\"/" /etc/jitsi/videobridge/jvb.conf
    echo -e "${GREEN}✓ JVB config updated${NC}"
fi

# 5. Update Prosody configuration
echo -e "${YELLOW}5. Updating Prosody configuration...${NC}"
if [ -f /etc/prosody/conf.avail/*.cfg.lua ]; then
    OLD_PROSODY=$(ls /etc/prosody/conf.avail/*.cfg.lua | head -1)
    NEW_PROSODY="/etc/prosody/conf.avail/${TEST_HOSTNAME}.cfg.lua"
    
    cp "$OLD_PROSODY" "$NEW_PROSODY"
    
    # Update domain in prosody config
    OLD_DOMAIN=$(basename "$OLD_PROSODY" .cfg.lua)
    sed -i "s/${OLD_DOMAIN}/${TEST_HOSTNAME}/g" "$NEW_PROSODY"
    
    # Enable new config
    ln -sf "$NEW_PROSODY" "/etc/prosody/conf.d/${TEST_HOSTNAME}.cfg.lua"
    
    echo -e "${GREEN}✓ Prosody config updated${NC}"
fi

# 6. Update Nginx configuration
echo -e "${YELLOW}6. Updating Nginx configuration...${NC}"
if [ -f /etc/nginx/sites-available/*.conf ]; then
    OLD_NGINX=$(ls /etc/nginx/sites-available/*.conf | grep -v default | head -1)
    
    if [ -n "$OLD_NGINX" ]; then
        NEW_NGINX="/etc/nginx/sites-available/${TEST_HOSTNAME}.conf"
        
        cp "$OLD_NGINX" "$NEW_NGINX"
        
        # Update server_name in nginx config
        sed -i "s/server_name .*/server_name $TEST_HOSTNAME;/" "$NEW_NGINX"
        
        # Enable new config
        ln -sf "$NEW_NGINX" "/etc/nginx/sites-enabled/${TEST_HOSTNAME}.conf"
        
        # Test nginx config
        nginx -t
        
        echo -e "${GREEN}✓ Nginx config updated${NC}"
    fi
fi

# 7. Generate new SSL certificates with Let's Encrypt
echo ""
echo -e "${YELLOW}7. SSL Certificate Setup${NC}"
echo "You need to generate new SSL certificates for the test domain."
echo ""
echo "BEFORE running certbot, make sure:"
echo "  1. DNS A record for $TEST_HOSTNAME points to $TEST_IP"
echo "  2. Port 80 and 443 are open in firewall"
echo ""
read -p "Do you want to run certbot now? (yes/no): " run_certbot

if [ "$run_certbot" == "yes" ]; then
    certbot --nginx -d "$TEST_HOSTNAME" --non-interactive --agree-tos --email admin@${TEST_HOSTNAME} || {
        echo -e "${YELLOW}! Certbot failed. You may need to configure DNS first.${NC}"
        echo "Run manually later: certbot --nginx -d $TEST_HOSTNAME"
    }
fi

# 8. Restart services
echo ""
echo -e "${YELLOW}8. Restarting services...${NC}"
systemctl restart prosody
systemctl restart jicofo
systemctl restart jitsi-videobridge2
systemctl restart nginx

echo -e "${GREEN}✓ Services restarted${NC}"

# 9. Show service status
echo ""
echo -e "${YELLOW}Service Status:${NC}"
systemctl status prosody --no-pager -l | head -3
systemctl status jicofo --no-pager -l | head -3
systemctl status jitsi-videobridge2 --no-pager -l | head -3
systemctl status nginx --no-pager -l | head -3

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ CONFIGURATION COMPLETED!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Test server configured for: $TEST_HOSTNAME"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify DNS: dig $TEST_HOSTNAME"
echo "2. Test SSL: https://$TEST_HOSTNAME"
echo "3. Test Jitsi: https://$TEST_HOSTNAME (create a test room)"
echo ""
echo "If you need to regenerate SSL certificates later:"
echo "  certbot --nginx -d $TEST_HOSTNAME"
echo ""
echo "Backup files created with .bak extension"
