#!/bin/bash
# Deploy landing page and update nginx config

set -e

SERVER="root@108.61.245.179"
SSH_KEY="$HOME/.ssh/rv2class_deploy"

echo "🚀 Deploying landing page with Firebase auth..."

# Step 1: Upload landing page
echo "1️⃣ Uploading landing.html to server..."
scp -i "$SSH_KEY" jitsi-custom/landing.html "$SERVER":/usr/share/jitsi-meet/landing.html

# Step 2: Create new nginx config
echo "2️⃣ Creating new nginx configuration..."
cat > /tmp/nginx-landing.conf << 'EOF'
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

    # ============= LANDING PAGE (Root) =============
    
    location = / {
        root /usr/share/jitsi-meet;
        charset utf-8;
        try_files /landing.html =404;
    }

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
}
EOF

# Step 3: Upload and apply nginx config
echo "3️⃣ Uploading nginx configuration..."
scp -i "$SSH_KEY" /tmp/nginx-landing.conf "$SERVER":/etc/nginx/sites-available/app.rv2class.com.conf

echo "4️⃣ Testing and reloading nginx..."
ssh -i "$SSH_KEY" "$SERVER" "nginx -t && systemctl reload nginx"

# Step 4: Stop PM2 frontend (no longer needed)
echo "5️⃣ Stopping Next.js frontend (no longer needed)..."
ssh -i "$SSH_KEY" "$SERVER" "pm2 stop rv2class || true && pm2 delete rv2class || true && pm2 save"

echo ""
echo "✅ Done! Landing page deployed successfully!"
echo ""
echo "🧪 Test it:"
echo "   1. Visit: https://app.rv2class.com"
echo "      → Should show Firebase Google login"
echo ""
echo "   2. Sign in with Google"
echo "      → Should show your profile"
echo ""
echo "   3. Click 'Join Meeting'"
echo "      → Should redirect to Jitsi prejoin page"
echo ""
echo "📝 Room URL format: https://app.rv2class.com/meet/roomname"
echo ""
