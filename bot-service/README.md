# Complete Jitsi Lobby System with Bot Moderator

## 🎯 System Overview

This is a complete implementation of a persistent Jitsi lobby system where:

1. **Bot moderators** join teacher rooms 24/7 and maintain lobby
2. **Teachers** get JWT tokens with moderator privileges for auto-admission
3. **Students** join without JWT and wait in lobby for teacher approval

## 📁 Project Structure

```
bot-service/
├── index.js              # Main bot service - manages all room bots
├── RoomBot.js            # Individual bot class for each room
├── JWTService.js         # JWT generation and verification
├── jwt-api.js            # API endpoint for frontend to get JWTs
├── package.json          # Dependencies
├── ecosystem.config.cjs  # PM2 configuration
├── .env.example          # Environment variables template
└── README.md             # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd bot-service
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
nano .env
```

**Required Variables:**

```env
# Jitsi Configuration
JITSI_DOMAIN=meet.jit.si  # or your self-hosted domain

# JWT Configuration (REQUIRED for moderator auto-admission)
JWT_SECRET=your-secure-secret-key-min-32-chars
JWT_APP_ID=rv2class
JWT_ISSUER=rv2class

# Firebase Admin SDK
FIREBASE_PROJECT_ID=tracking-budget-app
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tracking-budget-app.iam.gserviceaccount.com

# API Ports
PORT=3001           # Bot management API
JWT_API_PORT=3002   # JWT generation API

# Bot Configuration
BOT_DISPLAY_NAME=Lobby Bot
CHECK_INTERVAL=5000
```

#### Getting Firebase Admin Credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Copy the values from the downloaded JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters!)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### 3. Start the Services

**Development Mode:**
```bash
npm run dev
```

**Production Mode (with PM2):**
```bash
npm install -g pm2
npm run pm2:start
```

**PM2 Commands:**
```bash
npm run pm2:stop      # Stop service
npm run pm2:restart   # Restart service
npm run pm2:logs      # View logs
pm2 status            # Check status
```

## 🔧 How It Works

### Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    System Architecture                       │
└─────────────────────────────────────────────────────────────┘

1. STARTUP (Bot Service)
   ┌──────────────────────┐
   │  Bot Service Starts  │
   │                      │
   │  • Query Firebase    │
   │  • Get all teachers  │
   │  • Start bot per room│
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Bot Joins Rooms     │
   │                      │
   │  • teacher-romanvol  │
   │  • teacher-violet6   │
   │  • teacher-john123   │
   │                      │
   │  🔒 Enable Lobby     │
   └──────────────────────┘

2. TEACHER FLOW
   ┌──────────────────────┐
   │  Teacher Logs In     │
   │  (Google OAuth)      │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Frontend Requests   │
   │  JWT from API        │
   │                      │
   │  POST /api/jwt/teacher
   │  Authorization: Bearer <firebase-token>
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  JWT Generated       │
   │  moderator: true     │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Teacher Joins Jitsi │
   │  with JWT            │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Bot Detects         │
   │  moderator=true      │
   │  → Auto-admits       │
   └──────────────────────┘

3. STUDENT FLOW
   ┌──────────────────────┐
   │  Student Clicks      │
   │  "Join Class"        │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Student Joins Jitsi │
   │  (NO JWT)            │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Bot Detects         │
   │  non-moderator       │
   │  → Places in lobby   │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Student Waits       │
   │  Teacher Gets Notif  │
   │  Teacher Admits      │
   └──────────────────────┘
```

### Key Features

#### 1. Persistent Lobby
- Bot joins room immediately when teacher registers
- Lobby stays active 24/7, even when room is empty
- Bot auto-reconnects if disconnected

#### 2. Teacher Auto-Admission
- Teachers get JWT with `moderator: true`
- Bot detects moderator role from JWT
- Teachers are instantly admitted to conference
- No manual approval needed

#### 3. Student Management
- Students join without JWT (or with `moderator: false`)
- Bot places them in lobby automatically
- Teacher sees lobby notification in Jitsi
- Teacher manually admits students

## 📡 API Endpoints

### Bot Management API (Port 3001)

#### Health Check
```bash
GET /health

Response:
{
  "status": "ok",
  "activeBots": 3,
  "rooms": ["teacher-romanvol", "teacher-violet6", "teacher-john123"]
}
```

#### Start Bot for Room
```bash
POST /bot/start/:roomName

Example:
POST /bot/start/teacher-romanvol

Response:
{
  "success": true,
  "message": "Bot started for teacher-romanvol"
}
```

#### Stop Bot for Room
```bash
POST /bot/stop/:roomName

Response:
{
  "success": true,
  "message": "Bot stopped for teacher-romanvol"
}
```

#### List All Bots
```bash
GET /bots

Response:
{
  "bots": [
    {
      "room": "teacher-romanvol",
      "status": "connected",
      "participants": 0
    }
  ]
}
```

### JWT API (Port 3002)

#### Generate Teacher JWT
```bash
POST /api/jwt/teacher
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "roomName": "teacher-romanvol"
}

Response:
{
  "success": true,
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 7200,
  "teacher": {
    "id": "romanvolkonidov",
    "name": "Roman Volkonidov",
    "email": "romanvolkonidov@gmail.com"
  }
}
```

#### Generate Student JWT (Optional)
```bash
POST /api/jwt/student
Content-Type: application/json

{
  "studentId": "student-123",
  "studentName": "John Smith",
  "roomName": "teacher-romanvol"
}

Response:
{
  "success": true,
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 14400,
  "student": {
    "id": "student-123",
    "name": "John Smith"
  }
}
```

#### Verify JWT
```bash
POST /api/jwt/verify
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "success": true,
  "valid": true,
  "decoded": { ... },
  "isModerator": true
}
```

## 🎨 Frontend Integration

### For Teachers (React/TypeScript)

```typescript
// In your TeacherAuthPage.tsx or similar

const handleStartMeeting = async () => {
  const user = firebase.auth().currentUser;
  if (!user) return;

  // Get Firebase ID token
  const idToken = await user.getIdToken();
  
  // Get teacher's permanent room
  const roomName = `teacher-${user.uid.substring(0, 8)}`;
  
  // Request JWT from your API
  const response = await fetch('http://localhost:3002/api/jwt/teacher', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ roomName })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Initialize Jitsi with JWT
    const api = new JitsiMeetExternalAPI('meet.jit.si', {
      roomName: roomName,
      jwt: data.jwt, // This JWT has moderator: true
      parentNode: document.getElementById('jitsi-container'),
      userInfo: {
        displayName: user.displayName,
        email: user.email
      }
    });
    
    // Listen for lobby notifications
    api.addEventListener('participantKnockingToJoin', (participant) => {
      showNotification(`${participant.name} is waiting in lobby`);
      
      // Admit button
      admitBtn.onclick = () => {
        api.executeCommand('answerKnockingParticipant', participant.id, true);
      };
    });
  }
};
```

### For Students (Simple HTML/JS)

```javascript
// Student just joins without JWT
const studentName = "John Smith";
const teacherRoom = "teacher-romanvol";

const api = new JitsiMeetExternalAPI('meet.jit.si', {
  roomName: teacherRoom,
  // No JWT = not a moderator = lobby
  parentNode: document.getElementById('jitsi-container'),
  userInfo: {
    displayName: studentName
  }
});

// Bot will place student in lobby automatically
```

## 🔒 Security Considerations

1. **JWT Secret**: Use a strong, random secret (min 32 characters)
2. **HTTPS Only**: Always use HTTPS in production
3. **Token Expiration**: Teachers' JWTs expire after 2 hours (configurable)
4. **Firebase Auth**: Verify teacher identity via Firebase before issuing JWT
5. **CORS**: Configure allowed origins in `jwt-api.js`

## 📝 Logging

All logs include room name prefix for easy debugging:

```
✅ [teacher-romanvol] Bot joined conference
🚪 [teacher-romanvol] User knocking: John Smith (abc123)
✅ [teacher-romanvol] Auto-admitting teacher: Roman Volkonidov
⏸️  [teacher-romanvol] Student waiting in lobby: Jane Doe
```

## 🐛 Troubleshooting

### Bot Not Connecting

1. Check JWT configuration in `.env`
2. Verify Jitsi domain is correct
3. Check firewall allows outbound HTTPS

```bash
# Test connection
curl -I https://meet.jit.si/http-bind
```

### Teacher Not Auto-Admitted

1. Verify JWT is being passed to Jitsi
2. Check JWT has `moderator: true` in payload
3. Verify bot is running in the room

```bash
# Check active bots
curl http://localhost:3001/health

# Verify JWT
curl -X POST http://localhost:3002/api/jwt/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_JWT_TOKEN"}'
```

### Student Not in Lobby

1. Ensure student is NOT sending a JWT
2. Verify bot is connected to room
3. Check lobby is enabled

```bash
# View bot logs
pm2 logs jitsi-bot-service
```

## 📊 Monitoring

### PM2 Monitoring

```bash
pm2 status              # Service status
pm2 logs                # View logs
pm2 monit               # Resource usage
pm2 describe jitsi-bot-service  # Detailed info
```

### Health Checks

Set up monitoring with:

```bash
# Check every 5 minutes
*/5 * * * * curl -f http://localhost:3001/health || echo "Bot service down"
```

## 🔄 Auto-Restart on Failure

PM2 automatically restarts the service if it crashes:

- Max restarts: 10 attempts
- Min uptime: 10 seconds before considering stable
- Memory limit: 500MB (restart if exceeded)

## 📦 Deployment

### Using PM2 (Recommended)

```bash
# On your server
cd /path/to/bot-service
npm install
npm run pm2:start

# Auto-start on system reboot
pm2 startup
pm2 save
```

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .

CMD ["node", "index.js"]
```

### Using systemd

Create `/etc/systemd/system/jitsi-bot.service`:

```ini
[Unit]
Description=Jitsi Bot Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/bot-service
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 📚 Additional Resources

- [Jitsi Meet API Docs](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe)
- [lib-jitsi-meet](https://github.com/jitsi/lib-jitsi-meet)
- [JWT Authentication](https://github.com/jitsi/lib-jitsi-meet-tokens)

## 🤝 Support

For issues or questions:
1. Check logs: `pm2 logs jitsi-bot-service`
2. Verify environment variables
3. Test API endpoints manually
4. Check Jitsi server status

---

## 🎉 Success Indicators

When everything is working:

✅ Bot service shows "✅ Bot service initialized with X active bots"
✅ Teachers join rooms instantly (auto-admitted)
✅ Students see lobby screen
✅ Teachers receive lobby notifications
✅ Bots auto-reconnect after disconnects
✅ New teachers get bots automatically
