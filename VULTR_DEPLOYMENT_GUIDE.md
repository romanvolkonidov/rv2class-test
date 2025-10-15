# 🚀 Automated Vultr Deployment - Quick Start

## What This Does

Automatically deploys Jitsi Meet and/or Coturn on Vultr using the API. Everything is automated - just run one command!

## Prerequisites

- ✅ Vultr API key (you have it!)
- ✅ Domain name for Jitsi (e.g., jitsi.rv2class.com)
- ✅ SSH access ability
- ✅ 10-15 minutes of time

## One-Command Deployment

```bash
./deploy-vultr-automated.sh
```

That's it! The script will:
1. ✅ Create VPS on Vultr
2. ✅ Install Ubuntu 22.04
3. ✅ Configure firewall
4. ✅ Install Jitsi Meet (with SSL)
5. ✅ Install Coturn (optional)
6. ✅ Generate all credentials
7. ✅ Save configuration files
8. ✅ Give you next steps

## Deployment Options

When you run the script, you'll choose:

### Option 1: Both Jitsi + Coturn ($18/month) ✅ **Recommended**
- Full self-hosted Jitsi
- TURN/STUN server for connectivity
- Custom domain
- All features

### Option 2: Only Coturn ($6/month)
- Just the TURN/STUN server
- Keep using meet.jit.si for Jitsi
- Improves connectivity
- Cheap and effective

### Option 3: Only Jitsi ($12/month)
- Self-hosted Jitsi only
- Uses public STUN servers
- Good for most cases

## Step-by-Step

### 1. Prepare Your Domain

Before running the script, have your domain ready:
- `jitsi.rv2class.com` (or whatever you choose)
- You'll need to add DNS A record during deployment

### 2. Run the Script

```bash
cd /home/roman/Documents/rv2class
./deploy-vultr-automated.sh
```

### 3. Answer the Prompts

```
What would you like to deploy?
  1) Both Jitsi + Coturn (Recommended) - $18/month
  2) Only Coturn - $6/month
  3) Only Jitsi - $12/month

Choose (1/2/3): 1

Enter domain for Jitsi: jitsi.rv2class.com
Enter your email for SSL: your@email.com

Choose region (default: jnb): [Enter]
```

### 4. Wait for Deployment

The script will:
- Create the VPS (~30 seconds)
- Wait for it to boot (~30 seconds)
- Install software (~5-10 minutes)
- Configure everything
- Generate credentials

### 5. Update DNS

When prompted:
```
IMPORTANT: Update your DNS NOW!
Add this A record:
  jitsi.rv2class.com  →  45.76.xxx.xxx
```

Go to your DNS provider and add the A record, then press Enter.

### 6. Get Your Results

After completion, you'll see:
```
╔═══════════════════════════════════════════════════════════╗
║              Deployment Complete! 🎉                       ║
╚═══════════════════════════════════════════════════════════╝

═══ Jitsi Meet Server ═══
  URL: https://jitsi.rv2class.com
  IP: 45.76.xxx.xxx
  Info: /tmp/jitsi-info.txt

═══ Coturn Server ═══
  IP: 45.76.xxx.xxx
  STUN: stun:45.76.xxx.xxx:3478
  Credentials: /tmp/coturn-credentials.txt

═══ Server Access ═══
  SSH: ssh -i ~/.ssh/vultr_rv2class root@45.76.xxx.xxx
```

### 7. Update Your Frontend

The script creates `/tmp/jitsi-frontend-config.txt` with exact instructions:

```typescript
// In components/JitsiRoom.tsx
const domain = "jitsi.rv2class.com";  // Change from meet.jit.si
```

### 8. Deploy to Vercel

```bash
git add components/JitsiRoom.tsx
git commit -m "Update to self-hosted Jitsi"
git push
```

Vercel auto-deploys!

### 9. Test It!

Visit `https://jitsi.rv2class.com` and start a meeting!

## What Gets Created

### Files Saved Locally
- `/tmp/vultr-instance-info.json` - Server details
- `/tmp/coturn-credentials.txt` - TURN/STUN credentials
- `/tmp/jitsi-info.txt` - Jitsi configuration
- `/tmp/jitsi-frontend-config.txt` - Frontend update instructions
- `~/.ssh/vultr_rv2class` - SSH key for server access

### On the Server
- `/root/coturn-credentials.txt` - Coturn info
- `/root/jitsi-info.txt` - Jitsi info
- `/etc/turnserver.conf` - Coturn config
- `/etc/jitsi/` - Jitsi configuration

## Server Management

### SSH Into Server
```bash
ssh -i ~/.ssh/vultr_rv2class root@YOUR_SERVER_IP
```

### Check Service Status
```bash
# Jitsi services
systemctl status prosody
systemctl status jicofo
systemctl status jitsi-videobridge2
systemctl status nginx

# Coturn service
systemctl status coturn
```

### View Logs
```bash
# Jitsi logs
journalctl -u prosody -f
journalctl -u jicofo -f
journalctl -u jitsi-videobridge2 -f

# Coturn logs
journalctl -u coturn -f
tail -f /var/log/turnserver/turnserver.log
```

### Restart Services
```bash
# Restart all Jitsi services
systemctl restart prosody jicofo jitsi-videobridge2 nginx

# Restart Coturn
systemctl restart coturn
```

## Troubleshooting

### Issue: Can't access Jitsi URL
**Check:**
1. DNS propagation: `nslookup jitsi.rv2class.com`
2. Firewall: Ports 80, 443, 10000/udp, 4443 open
3. Nginx status: `systemctl status nginx`
4. SSL certificate: `certbot certificates`

### Issue: Deployment script fails
**Try:**
1. Check your Vultr API key is correct
2. Ensure you have available credits
3. Try a different region
4. Check network connection
5. Re-run the script (it's safe)

### Issue: SSH connection refused
**Wait longer:**
- VPS needs 1-2 minutes to fully boot
- Try: `ssh -i ~/.ssh/vultr_rv2class root@IP`
- Check VPS status in Vultr dashboard

### Issue: SSL certificate fails
**Ensure:**
1. DNS is pointing correctly (wait 5-10 minutes)
2. Ports 80/443 are open
3. Domain is correct
4. Try manual cert: `/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh`

## Cost Breakdown

### Jitsi + Coturn (Recommended)
- **VPS**: $12/month (2 vCPU, 4GB RAM)
- **Bandwidth**: Included (2TB)
- **Total**: ~$12-18/month

### Coturn Only
- **VPS**: $6/month (1 vCPU, 1GB RAM)
- **Total**: $6/month

### Why Combined is Better
- Only one VPS to manage
- Lower total cost ($12 vs $18)
- Simpler architecture
- Better performance (local TURN)

## Security Best Practices

### 1. Secure SSH Key
```bash
chmod 600 ~/.ssh/vultr_rv2class
```

### 2. Change Coturn Password
```bash
ssh -i ~/.ssh/vultr_rv2class root@IP
nano /etc/turnserver.conf
# Change the user password
systemctl restart coturn
```

### 3. Enable Firewall
Already done by script, but verify:
```bash
ufw status
```

### 4. Regular Updates
```bash
apt-get update && apt-get upgrade -y
```

### 5. Monitor Logs
```bash
journalctl -u coturn -f
journalctl -u jitsi-videobridge2 -f
```

## Updating Jitsi

To update Jitsi to latest version:
```bash
ssh -i ~/.ssh/vultr_rv2class root@IP
apt-get update
apt-get upgrade -y jitsi-meet
```

## Deleting Resources

### Via API (Recommended)
```bash
# Get instance ID from /tmp/vultr-instance-info.json
INSTANCE_ID="your-instance-id"

curl -X DELETE \
  -H "Authorization: Bearer W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A" \
  "https://api.vultr.com/v2/instances/$INSTANCE_ID"
```

### Via Dashboard
1. Go to https://my.vultr.com
2. Find your server
3. Click "Destroy"

## Backup & Recovery

### Backup Configuration
```bash
# Backup Jitsi config
scp -i ~/.ssh/vultr_rv2class root@IP:/etc/jitsi/ ./jitsi-backup/

# Backup Coturn config
scp -i ~/.ssh/vultr_rv2class root@IP:/etc/turnserver.conf ./coturn-backup.conf
```

### Create Snapshot
1. Go to Vultr dashboard
2. Select your server
3. Click "Snapshots"
4. Create snapshot (~$1/month)

## Support

### Jitsi Issues
- Docs: https://jitsi.github.io/handbook/
- Community: https://community.jitsi.org/

### Coturn Issues
- GitHub: https://github.com/coturn/coturn
- Docs: https://github.com/coturn/coturn/wiki

### Vultr Issues
- Support: https://my.vultr.com/support/
- Docs: https://www.vultr.com/docs/

## Next Steps After Deployment

1. ✅ Test Jitsi URL works
2. ✅ Update frontend code
3. ✅ Deploy to Vercel
4. ✅ Test from student side
5. ✅ Monitor first few lessons
6. ✅ Adjust settings if needed
7. ✅ Set up monitoring/alerts (optional)
8. ✅ Create backup snapshot

## Quick Commands Reference

```bash
# Deploy
./deploy-vultr-automated.sh

# SSH to server
ssh -i ~/.ssh/vultr_rv2class root@SERVER_IP

# View credentials
cat /tmp/coturn-credentials.txt
cat /tmp/jitsi-info.txt
cat /tmp/jitsi-frontend-config.txt

# Check services
systemctl status prosody jicofo jitsi-videobridge2 nginx coturn

# View logs
journalctl -u jitsi-videobridge2 -f
journalctl -u coturn -f

# Restart services
systemctl restart prosody jicofo jitsi-videobridge2 nginx
systemctl restart coturn
```

---

## Ready to Deploy?

```bash
cd /home/roman/Documents/rv2class
./deploy-vultr-automated.sh
```

**Time**: 10-15 minutes
**Cost**: $6-18/month
**Difficulty**: Easy (automated!)

Let's go! 🚀
