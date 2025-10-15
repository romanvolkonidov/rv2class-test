#!/bin/bash

# Add SSL to BBB after installation completes

echo "🔒 Adding SSL Certificate to BBB Johannesburg Server"
echo "===================================================="
echo ""

JHB_SERVER="139.84.240.149"

# Check if BBB is installed
echo "Checking if BBB is installed..."
if ! ssh root@$JHB_SERVER "bbb-conf --status" > /dev/null 2>&1; then
    echo "❌ BBB is not fully installed yet. Please wait and try again."
    exit 1
fi

echo "✅ BBB is installed"
echo ""

# Add SSL certificate
echo "Installing SSL certificate..."
ssh root@$JHB_SERVER "bbb-conf --restart && certbot --email romanvolkonidov@gmail.com --agree-tos --rsa-key-size 4096 -w /var/www/bigbluebutton-default/ -d bbb.rv2class.com --deploy-hook 'systemctl reload nginx' --webroot --non-interactive certonly"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL certificate installed successfully!"
    echo ""
    echo "Configuring BBB to use SSL..."
    ssh root@$JHB_SERVER "bbb-conf --setip bbb.rv2class.com"
    
    echo ""
    echo "🎉 BBB with SSL is ready!"
    echo ""
    echo "Next step: Run ./switch-to-jhb-bbb.sh to update your app"
else
    echo ""
    echo "⚠️  SSL installation failed. BBB is still accessible via HTTP."
    echo "You can manually add SSL later with: bbb-conf --setip bbb.rv2class.com"
fi
