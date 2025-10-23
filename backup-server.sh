#!/bin/bash
# Complete system backup script for RV2Class
# Creates backup of all important files: code, configs, nginx, jitsi configs

BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="rv2class-full-backup-${DATE}"

echo "🔄 Creating complete backup: ${BACKUP_NAME}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Create temporary directory for this backup
TEMP_BACKUP="/tmp/${BACKUP_NAME}"
mkdir -p "${TEMP_BACKUP}"

# 1. Backup deployed application files
echo "📦 Backing up application files..."
tar -czf "${TEMP_BACKUP}/app-files.tar.gz" -C /usr/share/jitsi-meet . 2>/dev/null

# 2. Backup nginx configuration
echo "🌐 Backing up nginx configs..."
mkdir -p "${TEMP_BACKUP}/nginx"
cp /etc/nginx/nginx.conf "${TEMP_BACKUP}/nginx/" 2>/dev/null
cp -r /etc/nginx/sites-enabled/* "${TEMP_BACKUP}/nginx/" 2>/dev/null
cp -r /etc/nginx/sites-available/* "${TEMP_BACKUP}/nginx/" 2>/dev/null

# 3. Backup Jitsi Meet configs
echo "📹 Backing up Jitsi configs..."
mkdir -p "${TEMP_BACKUP}/jitsi"
cp /usr/share/jitsi-meet/config.js "${TEMP_BACKUP}/jitsi/" 2>/dev/null
cp /usr/share/jitsi-meet/interface_config.js "${TEMP_BACKUP}/jitsi/" 2>/dev/null
cp -r /etc/jitsi "${TEMP_BACKUP}/jitsi/etc-jitsi" 2>/dev/null

# 4. Backup SSL certificates
echo "🔐 Backing up SSL certificates..."
mkdir -p "${TEMP_BACKUP}/ssl"
cp -r /etc/letsencrypt "${TEMP_BACKUP}/ssl/" 2>/dev/null

# 5. Backup coturn/TURN server config (if exists)
echo "🔄 Backing up TURN server config..."
cp /etc/turnserver.conf "${TEMP_BACKUP}/" 2>/dev/null

# 6. Create backup info file
echo "📝 Creating backup info..."
cat > "${TEMP_BACKUP}/backup-info.txt" << EOF
Backup Created: ${DATE}
Hostname: $(hostname)
IP Address: $(hostname -I | awk '{print $1}')
System: $(lsb_release -d | cut -f2)
Nginx Version: $(nginx -v 2>&1 | cut -d'/' -f2)

Included in this backup:
- Application files from /usr/share/jitsi-meet/
- Nginx configuration files
- Jitsi Meet configurations
- SSL certificates (Let's Encrypt)
- TURN server configuration

To restore this backup:
1. Extract: tar -xzf ${BACKUP_NAME}.tar.gz
2. Run restore script or manually copy files back to their locations
EOF

# Compress everything into final backup
echo "🗜️  Compressing final backup..."
cd /tmp
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"

# Cleanup temp directory
rm -rf "${TEMP_BACKUP}"

echo "✅ Backup complete: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "📊 Backup size: $(du -h ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz | cut -f1)"

# Keep only last 5 backups
echo "🧹 Cleaning old backups (keeping last 5)..."
cd "${BACKUP_DIR}"
ls -t rv2class-full-backup-*.tar.gz | tail -n +6 | xargs -r rm

echo "📋 Available backups:"
ls -lh "${BACKUP_DIR}"/rv2class-full-backup-*.tar.gz
