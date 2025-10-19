#!/bin/bash
# Final fix for Jitsi: Add DOCTYPE and fix interfaceConfig

set -e

SERVER="root@108.61.245.179"
SSH_KEY="$HOME/.ssh/rv2class_deploy"

echo "🔧 Fixing Jitsi DOCTYPE and interfaceConfig issues..."

# Step 1: Check current state
echo "1️⃣ Checking current index.html..."
ssh -i "$SSH_KEY" "$SERVER" "head -5 /usr/share/jitsi-meet/index.html"

# Step 2: Add DOCTYPE if missing
echo ""
echo "2️⃣ Adding DOCTYPE declaration..."
ssh -i "$SSH_KEY" "$SERVER" "cd /usr/share/jitsi-meet && \
  if ! grep -q '<!DOCTYPE html>' index.html; then \
    sed -i '1i<!DOCTYPE html>' index.html && echo '✅ DOCTYPE added'; \
  else \
    echo '✅ DOCTYPE already present'; \
  fi"

# Step 3: Add interface_config.js script tag in the correct location
echo ""
echo "3️⃣ Adding interface_config.js script tag..."
ssh -i "$SSH_KEY" "$SERVER" "cd /usr/share/jitsi-meet && \
  if ! grep -q 'interface_config.js' index.html; then \
    sed -i '/<head>/a\    <script src=\"/interface_config.js\"></script>' index.html && echo '✅ interface_config.js script tag added'; \
  else \
    echo '✅ interface_config.js already referenced'; \
  fi"

# Step 4: Verify interface_config.js exists and is accessible
echo ""
echo "4️⃣ Verifying interface_config.js exists..."
ssh -i "$SSH_KEY" "$SERVER" "ls -lh /usr/share/jitsi-meet/interface_config.js"

# Step 5: Show the fixed HTML head
echo ""
echo "5️⃣ Verifying fixed HTML structure..."
ssh -i "$SSH_KEY" "$SERVER" "head -10 /usr/share/jitsi-meet/index.html"

# Step 6: Test that the file is served correctly
echo ""
echo "6️⃣ Testing interface_config.js is accessible via HTTP..."
sleep 1
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://app.rv2class.com/interface_config.js)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ interface_config.js is accessible (HTTP $HTTP_CODE)"
else
  echo "⚠️  Warning: interface_config.js returned HTTP $HTTP_CODE"
fi

echo ""
echo "✅ Done! Fixed issues:"
echo "   ✓ Added <!DOCTYPE html>"
echo "   ✓ Added <script src=\"/interface_config.js\"></script>"
echo ""
echo "🧪 Test now:"
echo "   Visit: https://app.rv2class.com/meet/test123"
echo "   - Should be in Standards Mode (no Quirks Mode warning)"
echo "   - Should load without interfaceConfig error"
echo ""
echo "💡 If you still see the error, do a hard refresh: Ctrl+Shift+R"
