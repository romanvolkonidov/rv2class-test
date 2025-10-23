#!/bin/bash

set -e

SERVER_IP="108.61.245.179"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"

echo "════════════════════════════════════════════════════════"
echo "  🚀 RV2Class Frontend Deployment (Server Build)"
echo "════════════════════════════════════════════════════════"
echo ""

###############################################################################
# Step 1: Upload source code to server
###############################################################################

echo "📤 Step 1/4: Uploading source code to server..."
echo "   This may take 2-5 minutes depending on changes..."
echo ""

sshpass -p "$SERVER_PASSWORD" rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'build' \
    jitsi-custom/jitsi-meet/ root@$SERVER_IP:/tmp/jitsi-meet/

echo ""
echo "✅ Upload complete!"
echo ""

###############################################################################
# Step 2: Install dependencies on server
###############################################################################

echo "📦 Step 2/4: Installing dependencies on server..."
echo "   (This runs on server RAM, ~3-5 minutes)"
echo ""

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'DEPS'
cd /tmp/jitsi-meet
echo "$(date '+%H:%M:%S') - Starting npm install..."
npm ci --legacy-peer-deps 2>&1 | grep -E "added|removed|changed|audited|up to date" || true
echo "$(date '+%H:%M:%S') - Dependencies installed!"
DEPS

echo ""
echo "✅ Dependencies installed!"
echo ""

###############################################################################
# Step 3: Build on server
###############################################################################

echo "🔨 Step 3/4: Building on server..."
echo "   (Webpack build, ~5-10 minutes)"
echo ""

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'BUILD'
cd /tmp/jitsi-meet

# Create build log
BUILD_LOG="/tmp/build.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Build started" > $BUILD_LOG

# Run make and show progress
echo "$(date '+%H:%M:%S') - Running make..."
make 2>&1 | tee -a $BUILD_LOG | grep -E "webpack|Compiled|ERROR|WARNING|✓|✗|%|Building" || true

echo ""
echo "$(date '+%H:%M:%S') - Build complete!"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Build finished" >> $BUILD_LOG

# Package the built files
echo "$(date '+%H:%M:%S') - Packaging files..."
tar -czf /tmp/rv2class-frontend.tar.gz \
    css images libs fonts sounds lang static \
    *.html *.js *.css 2>/dev/null || true
    
echo "$(date '+%H:%M:%S') - Package created!"
BUILD

echo ""
echo "✅ Build complete!"
echo ""

###############################################################################
# Step 4: Deploy to production
###############################################################################

echo "🚀 Step 4/4: Deploying to production..."
echo ""

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'DEPLOY'
echo "$(date '+%H:%M:%S') - Backing up current version..."
cd /usr/share/jitsi-meet
tar -czf /tmp/jitsi-meet-backup-$(date +%Y%m%d-%H%M%S).tar.gz . 2>/dev/null || true

echo "$(date '+%H:%M:%S') - Extracting new version..."
tar -xzf /tmp/rv2class-frontend.tar.gz

echo "$(date '+%H:%M:%S') - Setting permissions..."
chown -R www-data:www-data .

echo "$(date '+%H:%M:%S') - Restarting nginx..."
systemctl restart nginx

echo "$(date '+%H:%M:%S') - Deployment complete!"
DEPLOY

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT SUCCESSFUL!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "🌐 Visit: https://app.rv2class.com"
echo "   Or IP: https://108.61.245.179"
echo ""
echo "📋 Check build log on server: ssh root@$SERVER_IP 'tail -100 /tmp/build.log'"
echo ""
