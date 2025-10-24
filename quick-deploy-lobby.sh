#!/bin/bash

# Quick Deploy - Rebuild and Deploy Jitsi with Lobby Changes

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

JITSI_DIR="/home/roman/Documents/rv2class-test/jitsi-custom/jitsi-meet"

echo "🚀 Quick Deploy - Jitsi with Lobby Implementation"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -d "$JITSI_DIR" ]; then
    echo "❌ Error: Jitsi directory not found: $JITSI_DIR"
    exit 1
fi

cd "$JITSI_DIR"

echo "Step 1: Installing dependencies (if needed)..."
if [ ! -d "node_modules" ]; then
    echo "📦 Running npm install..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "Step 2: Building Jitsi Meet frontend..."
echo "⏳ This may take a few minutes..."
make || {
    echo "❌ Build failed!"
    echo "Trying alternative build method..."
    npm run build || exit 1
}

echo ""
echo "✅ Build complete!"
echo ""

echo "Step 3: Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEPLOY_DIR="/tmp/jitsi-deploy-$TIMESTAMP"
mkdir -p "$DEPLOY_DIR"

# Copy essential files
if [ -d "libs" ]; then
    cp -r libs "$DEPLOY_DIR/"
fi

if [ -d "css" ]; then
    cp -r css "$DEPLOY_DIR/"
fi

if [ -d "images" ]; then
    cp -r images "$DEPLOY_DIR/"
fi

if [ -d "fonts" ]; then
    cp -r fonts "$DEPLOY_DIR/"
fi

if [ -f "config.js" ]; then
    cp config.js "$DEPLOY_DIR/"
fi

if [ -f "interface_config.js" ]; then
    cp interface_config.js "$DEPLOY_DIR/"
fi

# Copy React build
if [ -d "build" ]; then
    cp -r build/* "$DEPLOY_DIR/"
fi

echo "✅ Deployment package ready: $DEPLOY_DIR"
echo ""

echo "Step 4: Backing up current server files..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
    "mkdir -p /root/backups && tar -czf /root/backups/jitsi-backup-$TIMESTAMP.tar.gz -C /usr/share/jitsi-meet . 2>/dev/null || true"

echo "✅ Server backup created: /root/backups/jitsi-backup-$TIMESTAMP.tar.gz"
echo ""

echo "Step 5: Uploading files to server..."
sshpass -p "$SERVER_PASS" rsync -avz --progress \
    -e "ssh -o StrictHostKeyChecking=no" \
    "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_IP:/usr/share/jitsi-meet/" || {
    echo "⚠️  rsync not available, using scp..."
    sshpass -p "$SERVER_PASS" scp -r -o StrictHostKeyChecking=no \
        "$DEPLOY_DIR/"* "$SERVER_USER@$SERVER_IP:/usr/share/jitsi-meet/"
}

echo ""
echo "✅ Files uploaded!"
echo ""

echo "Step 6: Setting correct permissions..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
    "chown -R root:root /usr/share/jitsi-meet && chmod -R 755 /usr/share/jitsi-meet"

echo "✅ Permissions set"
echo ""

echo "Step 7: Restarting Nginx..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
    "nginx -t && systemctl reload nginx" || {
    echo "⚠️  Nginx config test failed, trying restart anyway..."
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
        "systemctl restart nginx"
}

echo "✅ Nginx restarted"
echo ""

# Cleanup
rm -rf "$DEPLOY_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Your site: https://app.rv2class.com"
echo ""
echo "🧪 Test the lobby implementation:"
echo ""
echo "   Test 1: Student Joins First"
echo "   ---------------------------"
echo "   1. Open: https://app.rv2class.com/static/student-welcome.html?studentId=XXX"
echo "   2. Click 'Join Class'"
echo "   3. ✅ Should see lobby/waiting screen"
echo "   4. Teacher joins → admits student"
echo ""
echo "   Test 2: Teacher Joins First"
echo "   ---------------------------"
echo "   1. Teacher starts lesson from landing page"
echo "   2. ✅ Teacher joins directly"
echo "   3. Student joins"
echo "   4. ✅ Student in lobby, teacher admits"
echo ""
echo "🔍 Debug tips:"
echo "   • Check browser console for: [TeacherAuth] logs"
echo "   • Check server logs: ssh root@45.77.76.123 'journalctl -u prosody -f'"
echo ""
echo "📋 Backup location: /root/backups/jitsi-backup-$TIMESTAMP.tar.gz"
echo ""
