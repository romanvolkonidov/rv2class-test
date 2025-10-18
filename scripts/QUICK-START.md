# Quick Start: Clone Production to Test Server

## Step 1: Run the Cloning Script

```bash
cd /home/roman/Documents/rv2class-test/scripts
./clone-prod-to-test.sh
```

**Choose option 4** - "Full clone: Snapshot prod → Restore to test"

This will:
1. Create a snapshot of your production server (207.246.95.30)
2. Restore it to your test server (45.63.0.93)
3. Takes ~10-20 minutes depending on server size

## Step 2: Configure the Test Server

After cloning completes, SSH into your test server:

```bash
ssh root@45.63.0.93
```

Then run the configuration script:

```bash
# Download the script (if needed)
# Or copy it from: /home/roman/Documents/rv2class-test/scripts/post-restore-config.sh

chmod +x post-restore-config.sh
sudo ./post-restore-config.sh
```

You'll be prompted for:
- Test server hostname (e.g., `jitsi-test.yourdomain.com`)
- Test server IP (45.63.0.93)

## Step 3: Update DNS

Point your test domain to: **45.63.0.93**

## Step 4: Test

Visit your test Jitsi instance and create a room!

---

## Troubleshooting

**If snapshot fails:**
- Check Vultr API key is valid
- Ensure servers are running

**If SSL fails:**
- Make sure DNS is pointing to test server
- Manually run: `certbot --nginx -d your-test-domain.com`

**Check service status:**
```bash
systemctl status jitsi-videobridge2
systemctl status jicofo
systemctl status prosody
```
