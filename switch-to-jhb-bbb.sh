#!/bin/bash

# Script to switch from New Jersey BBB to Johannesburg BBB
# Run this after BBB installation is complete

set -e

echo "🌍 Switching to Johannesburg BBB Server"
echo "========================================"
echo ""

JHB_SERVER="139.84.240.149"

# Check if BBB is installed
echo "Checking BBB installation on Johannesburg server..."
if ssh root@$JHB_SERVER "bbb-conf --check" > /dev/null 2>&1; then
    echo "✅ BBB is installed"
else
    echo "❌ BBB is not fully installed yet. Please wait and try again."
    exit 1
fi

# Get BBB credentials
echo ""
echo "Getting BBB credentials..."
BBB_INFO=$(ssh root@$JHB_SERVER "bbb-conf --secret")

echo "$BBB_INFO"

# Extract URL and SECRET
BBB_URL=$(echo "$BBB_INFO" | grep "URL:" | awk '{print $2}')
BBB_SECRET=$(echo "$BBB_INFO" | grep "Secret:" | awk '{print $2}')

echo ""
echo "📋 Credentials extracted:"
echo "BBB_URL: $BBB_URL"
echo "BBB_SECRET: $BBB_SECRET"
echo ""

# Update based on deployment platform
echo "Where is your app deployed?"
echo "1) Fly.io"
echo "2) Vercel"
echo "3) Both"
read -p "Choose (1/2/3): " choice

case $choice in
    1|3)
        echo ""
        echo "Updating Fly.io secrets..."
        fly secrets set BBB_URL="$BBB_URL" BBB_SECRET="$BBB_SECRET"
        echo "✅ Fly.io secrets updated"
        ;;
esac

case $choice in
    2|3)
        echo ""
        echo "For Vercel, run these commands:"
        echo "vercel env rm BBB_URL production"
        echo "vercel env rm BBB_SECRET production"
        echo "vercel env add BBB_URL production"
        echo "# Enter: $BBB_URL"
        echo "vercel env add BBB_SECRET production"
        echo "# Enter: $BBB_SECRET"
        ;;
esac

# Update local .env
echo ""
echo "Updating local .env.local..."
cat > .env.local <<EOF
# Johannesburg BBB Server
BBB_URL=$BBB_URL
BBB_SECRET=$BBB_SECRET
EOF

echo "✅ Local .env.local updated"
echo ""
echo "🎉 Migration to Johannesburg BBB complete!"
echo ""
echo "Next steps:"
echo "1. If using Fly.io: fly deploy"
echo "2. If using Vercel: vercel --prod"
echo "3. Test your video calls - latency should be much better!"
