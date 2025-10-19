#!/bin/bash
#
# Rebuild Jitsi Meet on production server
# Run this if GitHub Actions times out
#

SERVER_IP="108.61.245.179"
SERVER_USER="root"

echo "🚀 Starting Jitsi Meet build on production server..."
echo "📍 Server: $SERVER_IP"
echo ""

ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /var/www/rv2class/jitsi-custom/jitsi-meet

echo "📦 Checking node_modules..."
if [ ! -d "node_modules" ]; then
  echo "  → Installing dependencies..."
  npm install --legacy-peer-deps
else
  echo "  ✅ node_modules found"
fi

echo ""
echo "🏗️  Starting build in background..."
echo "  💡 This will take 10-20 minutes on first build, 2-5 min after"
echo ""

# Kill any existing build
pkill -f webpack 2>/dev/null

# Start fresh build
nohup make > /tmp/jitsi-build.log 2>&1 &
BUILD_PID=$!

echo "  ✅ Build started with PID: $BUILD_PID"
echo ""
echo "📊 Monitor with:"
echo "   tail -f /tmp/jitsi-build.log"
echo ""
echo "🔍 Check progress:"
echo "   grep -E 'webpack.Progress|building' /tmp/jitsi-build.log | tail -5"
echo ""
echo "✅ Check completion:"
echo "   ls -lh libs/app.bundle.min.js"
echo ""
echo "🔄 Deploy after build completes:"
echo "   cd /var/www/rv2class/jitsi-custom/jitsi-meet"
echo "   cp -r css libs sounds images fonts static lang *.html *.js /usr/share/jitsi-meet/"
echo "   systemctl reload nginx"

ENDSSH

echo ""
echo "✅ Build initiated! Check server for progress."
