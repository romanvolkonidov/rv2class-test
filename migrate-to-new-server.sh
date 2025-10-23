#!/bin/bash

# Migration script: Old server → New server
# Old: 108.61.245.179 (4 vCPU, 8GB RAM, $40/mo)
# New: 45.77.76.123 (1 vCPU, 2GB RAM, $10/mo)
# Savings: $30/month ($360/year)

set -e

OLD_SERVER="108.61.245.179"
NEW_SERVER="45.77.76.123"
PASSWORD="R2n@ww2TPS3(M8PF"

echo "🔄 Migration from $OLD_SERVER → $NEW_SERVER"
echo "================================================"
echo ""

# Step 1: Wait for new server to be ready
echo "⏳ Step 1: Waiting for new server to be ready..."
for i in {1..30}; do
    if sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@$NEW_SERVER "echo 'ready'" 2>/dev/null | grep -q "ready"; then
        echo "✅ New server is accessible!"
        break
    fi
    echo "   Attempt $i/30: Server not ready yet, waiting..."
    sleep 10
done

# Step 2: Install rsync on both servers
echo ""
echo "📦 Step 2: Installing rsync..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$OLD_SERVER "apt-get update && apt-get install -y rsync" > /dev/null 2>&1 || true
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$NEW_SERVER "apt-get update && apt-get install -y rsync sshpass" > /dev/null 2>&1

# Step 3: Copy SSH keys from old to new server for rsync
echo ""
echo "🔑 Step 3: Setting up SSH keys..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$OLD_SERVER "
    if [ ! -f ~/.ssh/id_rsa ]; then
        ssh-keygen -t rsa -N '' -f ~/.ssh/id_rsa
    fi
    cat ~/.ssh/id_rsa.pub
" > /tmp/old_server_pubkey.txt

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$NEW_SERVER "
    mkdir -p ~/.ssh
    echo '$(cat /tmp/old_server_pubkey.txt)' >> ~/.ssh/authorized_keys
    chmod 700 ~/.ssh
    chmod 600 ~/.ssh/authorized_keys
"

# Step 4: Sync all Jitsi configurations and data
echo ""
echo "🚀 Step 4: Syncing data from old → new server..."
echo "   This will copy:"
echo "   - /etc/jitsi/ (Jitsi configs)"
echo "   - /etc/prosody/ (Prosody configs)"
echo "   - /etc/nginx/ (nginx configs)"
echo "   - /usr/share/jitsi-meet/ (Your custom app)"
echo "   - /etc/letsencrypt/ (SSL certificates)"
echo ""

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$OLD_SERVER "
    # Install Jitsi on new server first (to get base packages)
    echo 'Installing Jitsi on new server...'
    ssh -o StrictHostKeyChecking=no root@$NEW_SERVER 'bash -s' << 'REMOTE_SCRIPT'
        # Add Jitsi repository
        curl -sL https://download.jitsi.org/jitsi-key.gpg.key | apt-key add -
        echo 'deb https://download.jitsi.org stable/' > /etc/apt/sources.list.d/jitsi-stable.list
        
        # Preseed configuration to avoid interactive prompts
        echo 'jitsi-videobridge jitsi-videobridge/jvb-hostname string app.rv2class.com' | debconf-set-selections
        echo 'jitsi-meet-web-config jitsi-meet/cert-choice select Generate a new self-signed certificate' | debconf-set-selections
        
        # Install Jitsi
        apt-get update
        DEBIAN_FRONTEND=noninteractive apt-get install -y jitsi-meet
        
        # Stop services before syncing
        systemctl stop nginx prosody jicofo jitsi-videobridge2
REMOTE_SCRIPT

    echo 'Syncing configurations...'
    
    # Sync Jitsi configs
    rsync -avz --delete /etc/jitsi/ root@$NEW_SERVER:/etc/jitsi/
    
    # Sync Prosody configs
    rsync -avz --delete /etc/prosody/ root@$NEW_SERVER:/etc/prosody/
    
    # Sync nginx configs
    rsync -avz --delete /etc/nginx/ root@$NEW_SERVER:/etc/nginx/
    
    # Sync custom Jitsi Meet app
    rsync -avz --delete /usr/share/jitsi-meet/ root@$NEW_SERVER:/usr/share/jitsi-meet/
    
    # Sync SSL certificates
    rsync -avz /etc/letsencrypt/ root@$NEW_SERVER:/etc/letsencrypt/ || echo 'No SSL certs to sync'
    
    echo 'Restarting services on new server...'
    ssh -o StrictHostKeyChecking=no root@$NEW_SERVER '
        systemctl restart prosody
        systemctl restart jicofo
        systemctl restart jitsi-videobridge2
        systemctl restart nginx
    '
"

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test new server: http://45.77.76.123"
echo "2. If working, update DNS A record for app.rv2class.com:"
echo "   Change from: 108.61.245.179"
echo "   Change to:   45.77.76.123"
echo "3. Wait for DNS propagation (5-30 minutes)"
echo "4. Test: https://app.rv2class.com"
echo "5. Delete old server to save \$30/month"
echo ""
echo "🎉 You'll save \$30/month (\$360/year)!"
