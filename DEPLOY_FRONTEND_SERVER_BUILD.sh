#!/bin/bash

set -e

SERVER_IP="108.61.245.179"
SERVER_PASSWORD="R2n@ww2TPS3(M8PF)"

echo "📤 Uploading jitsi-meet to server..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no \
    jitsi-custom/jitsi-meet root@$SERVER_IP:/tmp/

echo "🔨 Building on server (this uses server RAM, not yours)..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'BUILD'
cd /tmp/jitsi-meet
npm ci --legacy-peer-deps --silent
make
tar -czf /tmp/rv2class-frontend.tar.gz css images libs fonts sounds lang static *.html *.js *.css
BUILD

echo "🚀 Deploying..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP \
    "cd /usr/share/jitsi-meet && tar -xzf /tmp/rv2class-frontend.tar.gz && chown -R www-data:www-data . && systemctl restart nginx"

echo "✅ Done! Visit https://app.rv2class.com"