#!/bin/bash

# Quick test to verify server connection and app location

SERVER_IP="207.246.95.30"
SERVER_PASSWORD="eG7[89B2tgdJM=t2"

echo "Testing connection to production server..."
echo ""

# Install sshpass if needed
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    sudo apt-get update -qq
    sudo apt-get install -y sshpass
fi

echo "Connecting to $SERVER_IP..."
echo ""

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'
echo "✓ Connected successfully!"
echo ""
echo "=== Server Information ==="
echo ""

# Find app location
echo "Looking for rv2class app..."
if [ -d "/var/www/rv2class" ]; then
    echo "✓ Found at: /var/www/rv2class"
    APP_PATH="/var/www/rv2class"
elif [ -d "/root/rv2class" ]; then
    echo "✓ Found at: /root/rv2class"
    APP_PATH="/root/rv2class"
elif [ -d "/opt/rv2class" ]; then
    echo "✓ Found at: /opt/rv2class"
    APP_PATH="/opt/rv2class"
else
    echo "✗ Not found in common locations"
    echo "Searching..."
    find / -name "rv2class" -type d 2>/dev/null | head -5
    exit 1
fi

echo ""
echo "=== App Status ==="
cd $APP_PATH

# Check git status
echo "Git branch:"
git branch --show-current

echo ""
echo "Last commit:"
git log -1 --oneline

echo ""
echo "Git remote:"
git remote -v

echo ""
echo "=== Process Status ==="

# Check PM2
if command -v pm2 &> /dev/null; then
    echo "PM2 Status:"
    pm2 list
else
    echo "PM2 not installed"
fi

echo ""
echo "=== Node/NPM ==="
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

echo ""
echo "=== Package.json ==="
if [ -f "package.json" ]; then
    echo "✓ package.json exists"
    cat package.json | grep '"name"'
    cat package.json | grep '"version"'
else
    echo "✗ package.json not found"
fi

ENDSSH

echo ""
echo "=== Test Complete ==="
