#!/bin/bash
# Fix Jitsi charset encoding issues permanently

set -e

SERVER="root@108.61.245.179"
SSH_KEY="$HOME/.ssh/rv2class_deploy"

echo "🔧 Fixing Jitsi charset encoding issues..."

# Step 1: Reinstall jitsi-meet-web to get clean files
echo "1️⃣ Reinstalling jitsi-meet-web for clean state..."
ssh -i "$SSH_KEY" "$SERVER" "apt-get install -y --reinstall jitsi-meet-web >/dev/null 2>&1"

# Step 2: Disable SSI completely (it's causing encoding issues)
echo "2️⃣ Disabling SSI in nginx config..."
ssh -i "$SSH_KEY" "$SERVER" "sed -i 's/ssi on;/ssi off;/' /etc/nginx/sites-available/app.rv2class.com.conf"

# Step 3: Remove SSI includes from index.html
echo "3️⃣ Removing SSI includes from index.html..."
ssh -i "$SSH_KEY" "$SERVER" "cd /usr/share/jitsi-meet && \
  sed -i 's/<!--#include virtual=\"head.html\" -->//' index.html && \
  sed -i 's/<!--#include virtual=\"base.html\" -->//' index.html && \
  sed -i 's/<!--#include virtual=\"fonts.html\" -->//' index.html && \
  sed -i 's/<!--#include virtual=\"title.html\" -->//' index.html && \
  sed -i 's/<!--#include virtual=\"body.html\" -->//' index.html"

# Step 4: Ensure charset is set correctly in nginx
echo "4️⃣ Setting UTF-8 charset in nginx..."
ssh -i "$SSH_KEY" "$SERVER" "cat > /tmp/nginx-charset-fix.conf << 'NGINXEOF'
# Add this inside the Jitsi location block
charset utf-8;
override_charset on;
add_header Content-Type \"text/html; charset=UTF-8\" always;
NGINXEOF
"

# Step 5: Create clean nginx config
echo "5️⃣ Creating clean nginx config..."
cat > /tmp/nginx-jitsi-clean.conf << 'EOF'
server_names_hash_bucket_size 64;

types {
    application/wasm     wasm;
    audio/wav            wav;
}

upstream prosody {
    zone upstreams 64K;
    server 127.0.0.1:5280;
    keepalive 2;
}

upstream jvb1 {
    zone upstreams 64K;
    server 127.0.0.1:9090;
    keepalive 2;
}

upstream frontend {
    server 127.0.0.1:3000;
    keepalive 2;
}

map $arg_vnode $prosody_node {
    default prosody;
}

server {
    listen 80;
    listen [::]:80;
    server_name app.rv2class.com;

    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root         /usr/share/jitsi-meet;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.rv2class.com;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    ssl_certificate /etc/jitsi/meet/app.rv2class.com.crt;
    ssl_certificate_key /etc/jitsi/meet/app.rv2class.com.key;

    set $config_js_location /etc/jitsi/meet/app.rv2class.com-config.js;

    # ============= JITSI MEET SECTION (with /meet/ prefix) =============
    
    # Jitsi room URLs: /meet/roomname
    location ~ ^/meet/([a-zA-Z0-9_-]+)$ {
        rewrite ^/meet/(.*)$ /$1 break;
        root /usr/share/jitsi-meet;
        charset utf-8;
        override_charset on;
        add_header Content-Type "text/html; charset=UTF-8" always;
        try_files /index.html =404;
    }

    # Jitsi static files with /meet/ prefix
    location ~ ^/meet/(libs|css|images|fonts|lang|sounds)/(.*)$ {
        add_header 'Access-Control-Allow-Origin' '*';
        alias /usr/share/jitsi-meet/$1/$2;
        charset utf-8;
        if ($arg_v) {
            expires 1y;
        }
    }

    # Jitsi static files WITHOUT /meet/ prefix (for backwards compatibility)
    location ~ ^/(libs|css|images|fonts|lang|sounds)/(.*)$ {
        add_header 'Access-Control-Allow-Origin' '*';
        alias /usr/share/jitsi-meet/$1/$2;
        charset utf-8;
        if ($arg_v) {
            expires 1y;
        }
    }

    # Jitsi config and API files
    location = /config.js {
        alias $config_js_location;
        charset utf-8;
    }

    location = /interface_config.js {
        alias /usr/share/jitsi-meet/interface_config.js;
        charset utf-8;
    }

    location = /external_api.js {
        alias /usr/share/jitsi-meet/libs/external_api.min.js;
        charset utf-8;
    }

    location = /_api/room-info {
        proxy_pass http://prosody/room-info?$args;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $http_host;
    }

    # BOSH
    location = /http-bind {
        proxy_pass http://$prosody_node/http-bind?$args;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $http_host;
        proxy_set_header Connection "";
    }

    # xmpp websockets
    location = /xmpp-websocket {
        proxy_pass http://$prosody_node/xmpp-websocket?$args;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        tcp_nodelay on;
    }

    # colibri (JVB) websockets
    location ~ ^/colibri-ws/default-id/(.*) {
        proxy_pass http://jvb1/colibri-ws/default-id/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        tcp_nodelay on;
    }

    # ============= NEXT.JS FRONTEND SECTION =============
    
    # Next.js _next static files
    location /_next/ {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js API routes
    location /api/ {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js app routes
    location ~ ^/(student|teacher|room|students)(/|$|\?) {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Homepage - Next.js frontend
    location = / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Catch-all: Everything else goes to Next.js
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Step 6: Upload and apply nginx config
echo "6️⃣ Uploading clean nginx config..."
scp -i "$SSH_KEY" /tmp/nginx-jitsi-clean.conf "$SERVER":/etc/nginx/sites-available/app.rv2class.com.conf

# Step 7: Test and reload nginx
echo "7️⃣ Testing and reloading nginx..."
ssh -i "$SSH_KEY" "$SERVER" "nginx -t && systemctl reload nginx"

# Step 8: Verify the fix
echo "8️⃣ Verifying charset in response headers..."
sleep 2
curl -sI https://app.rv2class.com/meet/test123 | grep -i "content-type"

echo ""
echo "✅ Done! Jitsi should now display without garbage characters."
echo ""
echo "🧪 Test it:"
echo "   Visit: https://app.rv2class.com/meet/test123"
echo ""
echo "If you still see issues, the problem might be in:"
echo "   1. Browser cache (hard refresh with Ctrl+Shift+R)"
echo "   2. /usr/share/jitsi-meet/index.html file itself"
echo ""
