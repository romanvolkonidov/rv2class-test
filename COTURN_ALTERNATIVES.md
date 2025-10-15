# Coturn TURN Server - Deployment Alternatives

## ⚠️ Important: Fly.io Limitations for TURN

Fly.io has limitations for TURN servers:
- **UDP port range not fully supported** (49152-65535)
- STUN works fine, but TURN relay is limited
- Better suited for HTTP/HTTPS services

## ✅ Recommended Alternatives for Production TURN

### Option 1: Managed TURN Services (Easiest)

#### **Twilio TURN Service** ⭐ Recommended
- **Cost**: Pay per use (~$0.0004/min)
- **Setup**: 5 minutes
- **Reliability**: 99.99% uptime

```javascript
// In JitsiRoom.tsx
configOverwrite: {
  p2p: {
    stunServers: [
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
}

// For TURN with credentials (generate via Twilio API)
{
  urls: 'turn:global.turn.twilio.com:3478?transport=udp',
  username: 'your-username',
  credential: 'your-credential'
}
```

**Setup**:
1. Sign up at https://www.twilio.com/
2. Get TURN credentials from Console
3. Add to Jitsi config

#### **Xirsys** - Free Tier Available
- **Cost**: Free tier (10GB/month), then $10/month
- **Setup**: 10 minutes
- **Features**: Global network

```javascript
// Get credentials from Xirsys dashboard
{
  urls: 'turn:turn.xirsys.com:3478',
  username: 'your-username',
  credential: 'your-password'
}
```

**Setup**:
1. Sign up at https://xirsys.com/
2. Create application in dashboard
3. Get TURN credentials
4. Add to config

### Option 2: DigitalOcean Droplet (Best Value)

**Cost**: $6/month (1GB RAM, 1 vCPU)

#### Quick Deploy Script

```bash
#!/bin/bash
# Deploy Coturn on DigitalOcean Droplet

# 1. Create droplet (Ubuntu 22.04, $6/month)
# Use DigitalOcean web console or CLI

# 2. SSH into droplet
ssh root@your-droplet-ip

# 3. Install Coturn
apt update
apt install -y coturn

# 4. Configure Coturn
cat > /etc/turnserver.conf << 'EOF'
listening-port=3478
tls-listening-port=5349
min-port=49152
max-port=65535

# Use your droplet's IP
external-ip=YOUR_DROPLET_IP
listening-ip=0.0.0.0
relay-ip=0.0.0.0

realm=rv2class.com
server-name=rv2class-turn

fingerprint
lt-cred-mech

# Create user credentials
user=rvclass:YOUR_SECURE_PASSWORD

# SSL certificates (optional, for TLS)
# cert=/etc/letsencrypt/live/turn.rv2class.com/cert.pem
# pkey=/etc/letsencrypt/live/turn.rv2class.com/privkey.pem

verbose
log-file=/var/log/turnserver.log

no-loopback-peers
no-multicast-peers

# Security: Deny private IPs
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
EOF

# 5. Enable and start Coturn
systemctl enable coturn
systemctl start coturn

# 6. Configure firewall
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 5349/udp
ufw allow 49152:65535/udp
ufw enable

# 7. Test
turnutils_uclient -v -u rvclass -w YOUR_SECURE_PASSWORD YOUR_DROPLET_IP

echo "✅ Coturn installed!"
echo "URL: turn:YOUR_DROPLET_IP:3478"
```

**Monthly Cost**: $6
**Setup Time**: 15 minutes

### Option 3: AWS EC2 (Enterprise)

**Cost**: t3.micro (~$7/month with reserved instance)

Use same Coturn setup script as DigitalOcean above.

**Advantages**:
- Multiple regions available
- Auto-scaling support
- Enterprise SLA

### Option 4: Docker on Any VPS

```bash
# On your VPS (Linode, Vultr, etc.)
docker run -d --name coturn \
  --network=host \
  -e REALM=rv2class.com \
  -e USERNAME=rvclass \
  -e PASSWORD=your-secure-password \
  -e EXTERNAL_IP=$(curl -s ifconfig.me) \
  coturn/coturn:latest
```

## 🔧 Integration with Your App

### Update JitsiRoom Component

```typescript
// In /components/JitsiRoom.tsx

const options = {
  roomName: `RV2Class_${meetingID}`,
  // ... other options ...
  
  configOverwrite: {
    startWithAudioMuted: !isTutor,
    startWithVideoMuted: false,
    enableWelcomePage: false,
    prejoinPageEnabled: false,
    disableDeepLinking: true,
    defaultLanguage: "en",
    enableClosePage: false,
    
    // ⭐ Add TURN server configuration
    p2p: {
      enabled: true,
      stunServers: [
        { urls: 'stun:YOUR_TURN_SERVER:3478' }
      ]
    },
    
    // For authenticated TURN
    // iceServers: [
    //   {
    //     urls: 'turn:YOUR_TURN_SERVER:3478',
    //     username: 'rvclass',
    //     credential: 'your-password'
    //   }
    // ]
  },
  // ... rest of config
};
```

### Store TURN Credentials as Secrets

```bash
# Add to Fly.io secrets
fly secrets set TURN_SERVER="turn:your-server:3478" --app rv2class
fly secrets set TURN_USERNAME="rvclass" --app rv2class
fly secrets set TURN_PASSWORD="your-password" --app rv2class
```

Then read in your API route:
```typescript
// /app/api/turn-config/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    iceServers: [
      {
        urls: process.env.TURN_SERVER,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD,
      }
    ]
  });
}
```

## 📊 Cost Comparison

| Solution | Monthly Cost | Setup Time | Reliability | Best For |
|----------|-------------|------------|-------------|----------|
| **Twilio** | ~$2-20 (usage) | 5 min | ⭐⭐⭐⭐⭐ | Production |
| **Xirsys** | $0-10 | 10 min | ⭐⭐⭐⭐ | Small scale |
| **DigitalOcean** | $6 | 15 min | ⭐⭐⭐⭐ | Budget + Control |
| **AWS EC2** | $7-15 | 20 min | ⭐⭐⭐⭐⭐ | Enterprise |
| **Fly.io** | $5 | 5 min | ⭐⭐ (limited) | Dev/Test only |

## 🎯 Recommendation

### For Your Use Case (Teaching Platform)

**Development/Testing**:
- Use Jitsi's public STUN (free, already configured)
- No TURN needed for basic testing

**Production (<100 concurrent users)**:
- **Option 1**: DigitalOcean Coturn ($6/month)
  - Best value
  - Full control
  - Easy to manage

**Production (>100 concurrent users)**:
- **Option 1**: Twilio TURN (pay per use)
  - Scales automatically
  - Global network
  - No server management

## 🚀 Quick Start: DigitalOcean Coturn

### 1. Create Droplet
```bash
# Via web console or:
doctl compute droplet create coturn \
  --size s-1vcpu-1gb \
  --image ubuntu-22-04-x64 \
  --region nyc1
```

### 2. Deploy Coturn
```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Run the installation script above
# Or use this one-liner:
curl -sSL https://gist.github.com/[your-gist]/coturn-install.sh | bash
```

### 3. Test Connection
```bash
# On your local machine
docker run -it --rm \
  instrumentisto/coturn-utils:latest \
  turnutils_uclient -v \
  -u rvclass -w YOUR_PASSWORD \
  YOUR_DROPLET_IP
```

### 4. Add to Your App
```typescript
// In JitsiRoom.tsx
configOverwrite: {
  p2p: {
    stunServers: [
      { urls: 'stun:YOUR_DROPLET_IP:3478' }
    ]
  }
}
```

## 🔐 Security Hardening

### Coturn Security Best Practices

```bash
# 1. Use strong credentials
turnadmin -a -u username -r rv2class.com -p $(openssl rand -base64 32)

# 2. Restrict IP ranges
# Add to /etc/turnserver.conf:
allowed-peer-ip=YOUR_APP_IP/32

# 3. Enable rate limiting
# Add to config:
max-bps=1000000
total-quota=100000

# 4. Monitor usage
tail -f /var/log/turnserver.log | grep "allocation"

# 5. Set up fail2ban
apt install fail2ban
```

## 📈 Monitoring

### Check Coturn Status
```bash
# Check service
systemctl status coturn

# View logs
tail -f /var/log/turnserver.log

# Check connections
netstat -anp | grep 3478

# View statistics
journalctl -u coturn -f
```

### Monitor from Application
```javascript
// Log ICE connection states
api.addEventListener('iceConnectionStateChanged', (event) => {
  console.log('ICE Connection State:', event.iceConnectionState);
  
  // Track if TURN is being used
  if (event.iceConnectionState === 'connected') {
    // Get ICE candidates to see if TURN was used
    console.log('Connection established, checking candidate types...');
  }
});
```

## 🆘 Troubleshooting

### TURN Not Working

**Check 1**: Firewall
```bash
# On Coturn server
ufw status
# Ensure 3478/udp is open
```

**Check 2**: Configuration
```bash
# Test locally on Coturn server
turnutils_uclient -v -u rvclass -w password 127.0.0.1
```

**Check 3**: External Access
```bash
# From your laptop
turnutils_uclient -v -u rvclass -w password YOUR_SERVER_IP
```

**Check 4**: Jitsi Config
```javascript
// Enable debug logging
configOverwrite: {
  debug: true,
  // ... other config
}
```

## 📚 Additional Resources

- **Coturn Documentation**: https://github.com/coturn/coturn
- **DigitalOcean Tutorial**: https://www.digitalocean.com/community/tutorials/how-to-set-up-a-turn-server-with-coturn-on-ubuntu
- **WebRTC Testing**: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

## ✅ Final Recommendation

For your rv2class teaching platform:

1. **Start Simple**: Use Jitsi's default STUN (no TURN needed for most cases)
2. **If Users Report Connection Issues**: Deploy Coturn on DigitalOcean ($6/month)
3. **Scale Later**: Move to Twilio TURN if you grow beyond 100 concurrent users

**Deploy now, optimize later!** Most P2P connections work fine without TURN.

Happy Deploying! 🚀
