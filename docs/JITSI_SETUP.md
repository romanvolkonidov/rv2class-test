# Jitsi Meet Custom Build Setup

## Overview
This guide explains how to build and deploy a custom Jitsi Meet webapp to your self-hosted server, giving you complete freedom to modify the interface and integrate custom features like the annotation system.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App (rv2class)                                 │
│  - LiveKit for video/audio                              │
│  - Custom annotation system                             │
│  - Teacher/Student interfaces                           │
└─────────────────────────────────────────────────────────┘
                        │
                        │ (Future integration)
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Custom Jitsi Meet Webapp                               │
│  - Modified UI/UX                                       │
│  - Integrated annotation support                        │
│  - Custom branding                                      │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Self-Hosted Jitsi Infrastructure                       │
│  - Jitsi Videobridge (JVB)                             │
│  - Jicofo (Conference Focus)                           │
│  - Prosody (XMPP Server)                               │
│  - TURN/STUN (Coturn)                                  │
└─────────────────────────────────────────────────────────┘
```

## Current State

You already have the Jitsi Meet source code in:
```
jitsi-custom/jitsi-meet/
```

This is the complete Jitsi Meet webapp that you can customize.

## Quick Start - Building Custom Jitsi

### 1. Install Dependencies

```bash
cd jitsi-custom/jitsi-meet
npm install
```

### 2. Configure Your Domain

Edit `config.js` to point to your Jitsi server:

```javascript
var config = {
    hosts: {
        domain: 'your-jitsi-domain.com',
        muc: 'conference.your-jitsi-domain.com'
    },
    // ... other settings
};
```

### 3. Build the Webapp

```bash
# Development build with live reload
npm start

# Production build
make
```

### 4. Deploy to Server

The built files will be in the root directory. Deploy them to your server:

```bash
# On your local machine
cd jitsi-custom/jitsi-meet
tar czf jitsi-meet-build.tar.gz \
    *.html \
    *.js \
    css/ \
    images/ \
    libs/ \
    sounds/ \
    fonts/ \
    lang/

# Upload to server
scp jitsi-meet-build.tar.gz root@45.63.0.93:/tmp/

# On the server
ssh root@45.63.0.93
cd /usr/share/jitsi-meet
cp -r /usr/share/jitsi-meet /usr/share/jitsi-meet.backup
tar xzf /tmp/jitsi-meet-build.tar.gz
systemctl restart nginx
```

## Key Files to Customize

### Interface & Branding
- `react/features/base/ui/components/web/` - UI components
- `css/main.scss` - Main styles
- `images/` - Replace logos and images
- `lang/` - Translations

### Features
- `react/features/toolbox/` - Toolbar buttons
- `react/features/video-layout/` - Video layout
- `react/features/chat/` - Chat system
- `react/features/screen-share/` - Screen sharing

### Configuration
- `config.js` - Main configuration
- `interface_config.js` - UI configuration

## Integration with Your Annotation System

To integrate your canvas-based annotation system:

1. **Add annotation toggle to toolbar**
   - Edit `react/features/toolbox/components/web/Toolbox.js`
   - Add annotation button

2. **Inject your annotation component**
   - Import your `AnnotationOverlay.tsx` (convert to JS or use TypeScript)
   - Render it when screen sharing is active

3. **Sync annotation data**
   - Use Jitsi's data channel API
   - Mirror your LiveKit data channel implementation

## Servers

### Production Server
- **IP**: 207.246.95.30
- **Instance ID**: 31c86db7-75f6-4354-8858-94b301bd20a5
- **Name**: jitsi-coturn-rv2class
- **Status**: ✅ Running (DO NOT MODIFY)

### Test Server  
- **IP**: 45.63.0.93
- **Instance ID**: 75baae01-a079-48a9-9f8a-5196c1ad3a5b
- **Name**: jitsi-test
- **Status**: 🔄 Restoring from production snapshot
- **Use**: Safe environment for testing custom builds

## Development Workflow

1. **Make changes locally**
   ```bash
   cd jitsi-custom/jitsi-meet
   npm start  # Development server on localhost:8080
   ```

2. **Test on development server**
   - Opens in browser automatically
   - Hot reload enabled

3. **Build for production**
   ```bash
   make
   ```

4. **Deploy to test server first**
   - Test thoroughly
   - Verify all features work

5. **Deploy to production server**
   - Only after testing is complete

## Common Customizations

### Change Branding
```javascript
// interface_config.js
var interfaceConfig = {
    APP_NAME: 'Your App Name',
    NATIVE_APP_NAME: 'Your App',
    PROVIDER_NAME: 'Your Company',
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    // ... more options
};
```

### Disable Features
```javascript
// config.js
var config = {
    disableDeepLinking: true,
    disableInviteFunctions: true,
    doNotStoreRoom: true,
    // ... more options
};
```

### Custom Toolbar
Edit `react/features/toolbox/components/web/Toolbox.js` to add/remove buttons.

## Troubleshooting

### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Changes Not Appearing
```bash
# Hard rebuild
make clean
make
```

### Server Deployment Issues
```bash
# Check nginx configuration
nginx -t

# Check file permissions
chown -R www-data:www-data /usr/share/jitsi-meet

# Restart services
systemctl restart nginx
```

## Next Steps

1. ✅ Test server is being cloned from production
2. ⏳ Wait for server to finish restoring (check status in Vultr dashboard)
3. 📝 Run post-restore configuration (see scripts/post-restore-config.sh)
4. 🔨 Build custom Jitsi Meet webapp
5. 🚀 Deploy to test server
6. ✨ Integrate annotation system
7. 🎯 Deploy to production

## Resources

- [Jitsi Meet Developer Guide](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-web)
- [Jitsi Meet API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe)
- [Custom Jitsi Build Tutorial](https://community.jitsi.org/t/how-to-build-jitsi-meet-from-source-a-developers-guide/)

## Scripts Available

- `scripts/vultr-clone-now.sh` - Clone production to test (automated)
- `scripts/post-restore-config.sh` - Configure server after restore
- `scripts/check-status.sh` - Check server status
