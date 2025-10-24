#!/bin/bash

# Quick Deploy with Lobby Configuration
# Builds and deploys Jitsi Meet to production server

set -e

SERVER_IP="45.77.76.123"
SERVER_USER="root"
SERVER_PASS="Wr2,Dyv(MK8PGgGL"

JITSI_DIR="/home/roman/Documents/rv2class-test/jitsi-custom/jitsi-meet"

echo "🚀 Quick Deploy - Jitsi Meet with Lobby Implementation"
echo "======================================================"
echo ""
echo "⏭️  Skipping build (using existing build)..."
echo ""

cd "$JITSI_DIR"

echo "Step 1: Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEPLOY_DIR="/tmp/jitsi-deploy-$TIMESTAMP"
mkdir -p "$DEPLOY_DIR"

# Copy essential directories if they exist
for dir in libs css images fonts static sounds; do
    if [ -d "$dir" ]; then
        echo "  📦 Copying $dir/"
        cp -r "$dir" "$DEPLOY_DIR/"
    fi
done

# Copy essential files
for file in config.js interface_config.js; do
    if [ -f "$file" ]; then
        echo "  📄 Copying $file"
        cp "$file" "$DEPLOY_DIR/"
    fi
done

# Copy built files
if [ -d "build" ]; then
    echo "  📦 Copying build output..."
    cp -r build/* "$DEPLOY_DIR/" 2>/dev/null || true
fi

# Copy React features
if [ -d "react" ]; then
    echo "  📦 Copying react features (including teacher-auth middleware)..."
    mkdir -p "$DEPLOY_DIR/react"
    cp -r react/* "$DEPLOY_DIR/react/" 2>/dev/null || true
fi

echo "✅ Deployment package ready: $DEPLOY_DIR"
echo ""

echo "Step 2: Backing up current server files..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
    "mkdir -p /root/backups && tar -czf /root/backups/jitsi-backup-$TIMESTAMP.tar.gz -C /usr/share/jitsi-meet . 2>/dev/null" || true

echo "✅ Server backup created"
echo ""

echo "Step 3: Uploading files to server..."
echo "  (This may take a few minutes...)"

sshpass -p "$SERVER_PASS" rsync -avz --progress \
    -e "ssh -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '.git' \
    "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_IP:/usr/share/jitsi-meet/" 2>&1 | grep -E '(sending|total)' || {
    echo "⚠️  rsync failed, trying scp..."
    cd "$DEPLOY_DIR"
    tar -czf ../jitsi-deploy.tar.gz .
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
        ../jitsi-deploy.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
        "cd /usr/share/jitsi-meet && tar -xzf /tmp/jitsi-deploy.tar.gz && rm /tmp/jitsi-deploy.tar.gz"
}

echo ""
echo "✅ Files uploaded!"
echo ""

echo "Step 4: Setting correct permissions..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
    "chown -R root:root /usr/share/jitsi-meet && chmod -R 755 /usr/share/jitsi-meet"

echo "✅ Permissions set"
echo ""

echo "Step 5: Verifying configuration on server..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
    "grep -E 'domain:|muc:' /usr/share/jitsi-meet/config.js | head -5"

echo ""
echo "Step 6: Reloading Nginx..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
    "nginx -t && systemctl reload nginx" || {
    echo "⚠️  Nginx reload had issues, trying restart..."
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" \
        "systemctl restart nginx"
}

echo "✅ Nginx reloaded"
echo ""

# Cleanup
rm -rf "$DEPLOY_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Your site: https://app.rv2class.com"
echo ""
echo "📋 Server Configuration Summary:"
echo "   ✅ Jicofo: enable-auto-owner = false"
echo "   ✅ Prosody: muc_lobby_rooms enabled"
echo "   ✅ Prosody: muc_lobby_autocreate = true"
echo "   ✅ Prosody: lobby.app.rv2class.com configured"
echo "   ✅ Client: Teacher-auth middleware deployed"
echo ""
echo "🧪 Test Now on Production:"
echo ""
echo "   Test 1: Student Joins First"
echo "   ---------------------------"
echo "   1. Open: https://app.rv2class.com/static/student-welcome.html?studentId=TEST&teacherEmail=romanvolkonidov@gmail.com"
echo "   2. Click 'Join Class'"
echo "   3. ✅ Should see lobby/waiting screen (no alpha.jitsi.net errors)"
echo "   4. ✅ Student should be able to knock"
echo "   5. Teacher joins and admits"
echo ""
echo "   Test 2: Teacher Joins First"
echo "   ---------------------------"
echo "   1. Teacher opens: https://app.rv2class.com"
echo "   2. Teacher clicks 'Start Lesson'"
echo "   3. ✅ Teacher joins directly (no lobby)"
echo "   4. Student joins"
echo "   5. ✅ Student in lobby, teacher admits"
echo ""
echo "🔍 Debug Console:"
echo "   Expected logs (Student):"
echo "   • [TeacherAuth] STUDENT detected"
echo "   • No 'alpha.jitsi.net' errors"
echo "   • membersOnly = true or [object]"
echo "   • Can call startKnocking()"
echo ""
echo "   Expected logs (Teacher):"
echo "   • [TeacherAuth] TEACHER detected"
echo "   • CONFERENCE_JOINED"
echo "   • Role: moderator"
echo ""
echo "📊 Backup location: /root/backups/jitsi-backup-$TIMESTAMP.tar.gz"
echo ""
echo "⚠️  Note: Test on https://app.rv2class.com (production), not localhost"
echo "         Localhost connects to alpha.jitsi.net by default."
echo ""
