#!/bin/bash

# Fix the Vultr server with proper environment variables

SERVER_IP="108.61.245.179"
SERVER_PASSWORD='R2n@ww2TPS3(M8PF'

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Fixing Server Configuration                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Create .env.local file on server
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP bash << 'ENDSSH'
set -e

cd /var/www/rv2class

# Create .env.local with Firebase config
cat > .env.local << 'EOF'
# Firebase Configuration (from firebase_config.js)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tracking-budget-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://tracking-budget-app-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tracking-budget-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tracking-budget-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=912992088190
NEXT_PUBLIC_FIREBASE_APP_ID=1:912992088190:web:926c8826b3bc39e2eb282f

# Jitsi Configuration
NEXT_PUBLIC_JITSI_DOMAIN=app.rv2class.com
EOF

echo "✓ Created .env.local"

# Rebuild with new environment variables
echo "Rebuilding app with environment variables..."
npm run build

# Restart PM2
echo "Restarting application..."
pm2 restart rv2class
pm2 save

echo ""
echo "✓ Server updated successfully!"
pm2 list

ENDSSH

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Server Fixed! ✓                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Changes made:"
echo "  ✓ Added Firebase environment variables"
echo "  ✓ Added Jitsi domain configuration"
echo "  ✓ Rebuilt application"
echo "  ✓ Restarted PM2"
echo ""
echo "Test your app now: http://$SERVER_IP"
echo ""
