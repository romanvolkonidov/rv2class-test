# Testing Guide - Jitsi Bot Lobby System

## 🧪 Local Testing Setup

### Prerequisites
- Node.js 18+ installed
- Firebase project configured
- Access to meet.jit.si or self-hosted Jitsi

### 1. Setup Environment

```bash
cd /home/roman/Documents/rv2class-test/bot-service

# Copy environment template
cp .env.example .env

# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Edit .env and fill in Firebase credentials
nano .env
```

**Required Environment Variables:**
```env
JITSI_DOMAIN=meet.jit.si
JWT_SECRET=<generated-32-char-secret>
JWT_APP_ID=rv2class
JWT_ISSUER=rv2class
FIREBASE_PROJECT_ID=tracking-budget-app
FIREBASE_PRIVATE_KEY="<from-firebase-console>"
FIREBASE_CLIENT_EMAIL=<from-firebase-console>
PORT=3001
JWT_API_PORT=3002
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Services

**Terminal 1 - Bot Service:**
```bash
npm run dev
```

Expected output:
```
🚀 Initializing bot service...
📚 Found 2 teacher rooms: [ 'teacher-romanvol', 'teacher-violet6' ]
🤖 Starting bot for room: teacher-romanvol
✅ [teacher-romanvol] Bot connected
✅ [teacher-romanvol] Bot joined conference
🔒 [teacher-romanvol] Lobby enabled
✅ Bot service initialized with 2 active bots
👂 Listening for new teacher registrations...
🌐 API server running on port 3001
```

**Terminal 2 - JWT API (optional, started with bot service):**
Check if running:
```bash
curl http://localhost:3002/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "JWT API",
  "timestamp": "2025-10-25T..."
}
```

## ✅ Test Scenarios

### Test 1: Verify Bot Service Health

```bash
# Check bot service
curl http://localhost:3001/health

# Expected response:
{
  "status": "ok",
  "activeBots": 2,
  "rooms": ["teacher-romanvol", "teacher-violet6"]
}
```

**Success Criteria:**
- ✅ Status is "ok"
- ✅ Shows correct number of active bots
- ✅ Lists all teacher rooms

### Test 2: Generate Teacher JWT

```bash
# First, get Firebase ID token (use your app or Firebase Auth UI)
# Then:

curl -X POST http://localhost:3002/api/jwt/teacher \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{"roomName": "teacher-romanvol"}'

# Expected response:
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

**Success Criteria:**
- ✅ Returns success: true
- ✅ JWT token is present
- ✅ Teacher info is correct

### Test 3: Verify JWT Token

```bash
# Copy the JWT from Test 2, then:

curl -X POST http://localhost:3002/api/jwt/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "PASTE_JWT_HERE"}'

# Expected response:
{
  "success": true,
  "valid": true,
  "decoded": {
    "context": {
      "user": {
        "id": "romanvolkonidov",
        "name": "Roman Volkonidov",
        "email": "romanvolkonidov@gmail.com",
        "moderator": true  // ← Important!
      }
    },
    "room": "teacher-romanvol",
    ...
  },
  "isModerator": true
}
```

**Success Criteria:**
- ✅ valid: true
- ✅ decoded.context.user.moderator: true
- ✅ isModerator: true

### Test 4: Teacher Auto-Admission

**Setup:**
1. Make sure bot is running in teacher room (check logs)
2. Get teacher JWT from Test 2

**Test:**
1. Open browser to: https://meet.jit.si/teacher-romanvol?jwt=YOUR_JWT_HERE
2. Or use the frontend integration

**Watch Bot Logs:**
```bash
# In Terminal 1, you should see:
🚪 [teacher-romanvol] User knocking: Roman Volkonidov (abc123)
🔍 [teacher-romanvol] Checking participant: { name: 'Roman Volkonidov', role: 'moderator' }
✅ [teacher-romanvol] Auto-admitting teacher: Roman Volkonidov
```

**Success Criteria:**
- ✅ Teacher joins room with JWT
- ✅ Bot detects moderator role
- ✅ Teacher is auto-admitted (no lobby wait)
- ✅ Teacher enters conference immediately

### Test 5: Student Lobby Placement

**Setup:**
1. Teacher is in room (from Test 4)

**Test:**
1. Open incognito browser
2. Go to: https://meet.jit.si/teacher-romanvol
3. Enter student name
4. Click "Join meeting"

**Watch Bot Logs:**
```bash
# Should see:
🚪 [teacher-romanvol] User knocking: John Student (xyz789)
🔍 [teacher-romanvol] Checking participant: { name: 'John Student', role: undefined }
⏸️  [teacher-romanvol] Student waiting in lobby: John Student
```

**In Teacher's Browser:**
- Should see lobby notification: "John Student wants to join"

**Success Criteria:**
- ✅ Student placed in lobby (not auto-admitted)
- ✅ Bot logs show student waiting
- ✅ Teacher sees notification
- ✅ Student cannot enter until admitted

### Test 6: Manual Student Admission

**Continuing from Test 5:**

**In Teacher's Browser:**
1. Click "Admit" on lobby notification
2. Or use console:
   ```javascript
   api.executeCommand('answerKnockingParticipant', 'PARTICIPANT_ID', true);
   ```

**Watch Bot Logs:**
```bash
👤 [teacher-romanvol] User joined: John Student
```

**Success Criteria:**
- ✅ Student enters conference after admission
- ✅ Bot logs show user joined
- ✅ Teacher and student can see each other

### Test 7: Bot Reconnection

**Test:**
1. Kill the bot service (Ctrl+C in Terminal 1)
2. Wait 5 seconds
3. Restart: `npm run dev`

**Watch Logs:**
```bash
🚀 Initializing bot service...
🤖 Starting bot for room: teacher-romanvol
✅ [teacher-romanvol] Bot connected
✅ [teacher-romanvol] Bot joined conference
🔒 [teacher-romanvol] Lobby enabled
```

**Success Criteria:**
- ✅ Bot reconnects automatically
- ✅ Lobby is re-enabled
- ✅ Service continues working

### Test 8: New Teacher Registration

**Test:**
1. In Firebase, add a new teacher with UID: `testteacher123`
2. In Firebase, add a student with:
   ```json
   {
     "name": "Test Student",
     "teacherUid": "testteacher123",
     "teacherEmail": "test@teacher.com"
   }
   ```

**Watch Logs:**
```bash
🆕 New teacher detected: teacher-testtea
🤖 Starting bot for room: teacher-testtea
✅ [teacher-testtea] Bot connected
✅ [teacher-testtea] Bot joined conference
🔒 [teacher-testtea] Lobby enabled
```

**Success Criteria:**
- ✅ Bot service detects new teacher
- ✅ Bot automatically spawns for new room
- ✅ Lobby enabled in new room

## 🔧 Testing Frontend Integration

### Test 9: Frontend JWT Integration

**In your TeacherAuthPage.tsx:**

```typescript
// Add console logs for debugging
const handleStartMeeting = async () => {
  console.log('🧪 TEST: Starting meeting...');
  
  const user = firebase.auth().currentUser;
  console.log('🧪 TEST: Current user:', user?.email);
  
  const idToken = await user.getIdToken();
  console.log('🧪 TEST: Got Firebase token');
  
  const roomName = `teacher-${user.uid.substring(0, 8)}`;
  console.log('🧪 TEST: Room name:', roomName);
  
  const response = await fetch('http://localhost:3002/api/jwt/teacher', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ roomName })
  });
  
  const data = await response.json();
  console.log('🧪 TEST: JWT response:', data);
  
  if (data.success && data.jwt) {
    console.log('🧪 TEST: Initializing Jitsi with JWT');
    // ... initialize Jitsi
  }
};
```

**Success Criteria:**
- ✅ All console logs appear
- ✅ Firebase token obtained
- ✅ JWT API returns success
- ✅ Jitsi initializes with JWT

## 📊 Monitoring During Tests

### Real-time Monitoring

**Terminal 1 - Bot Logs:**
```bash
pm2 logs jitsi-bot-service --lines 50
```

**Terminal 2 - API Requests:**
```bash
# Watch health endpoint
watch -n 5 'curl -s http://localhost:3001/health | jq'
```

**Terminal 3 - Active Bots:**
```bash
# Check active bots
watch -n 10 'curl -s http://localhost:3001/bots | jq'
```

### Debugging Tools

**Check specific room bot:**
```bash
curl -s http://localhost:3001/bots | jq '.bots[] | select(.room == "teacher-romanvol")'
```

**Manually start bot:**
```bash
curl -X POST http://localhost:3001/bot/start/teacher-romanvol
```

**Manually stop bot:**
```bash
curl -X POST http://localhost:3001/bot/stop/teacher-romanvol
```

## 🐛 Common Issues & Solutions

### Issue 1: Bot Not Connecting

**Symptoms:**
- Bot service starts but bots don't connect
- Logs show connection failed

**Troubleshooting:**
```bash
# 1. Check JWT secret is set
grep JWT_SECRET .env

# 2. Test Jitsi endpoint
curl -I https://meet.jit.si/http-bind

# 3. Check firewall
sudo ufw status

# 4. Verify environment
node -e "console.log(require('dotenv').config())"
```

**Solution:**
- Verify JWT_SECRET is at least 32 characters
- Check internet connection
- Ensure meet.jit.si is accessible

### Issue 2: Teacher Not Auto-Admitted

**Symptoms:**
- Teacher has JWT but still placed in lobby
- Bot doesn't detect moderator role

**Troubleshooting:**
```bash
# 1. Verify JWT has moderator flag
curl -X POST http://localhost:3002/api/jwt/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_JWT"}'

# 2. Check bot logs for that room
pm2 logs | grep teacher-romanvol

# 3. Verify bot is in room
curl http://localhost:3001/bots | jq
```

**Solution:**
- Regenerate JWT
- Verify JWT_SECRET matches in both services
- Check bot is connected to room

### Issue 3: Student Not in Lobby

**Symptoms:**
- Student joins without lobby
- No lobby screen shown

**Troubleshooting:**
```bash
# 1. Check if bot enabled lobby
pm2 logs | grep "Lobby enabled"

# 2. Verify bot is running
curl http://localhost:3001/health

# 3. Check bot participant count
curl http://localhost:3001/bots
```

**Solution:**
- Restart bot service
- Manually enable lobby in Jitsi
- Check bot has moderator privileges

## ✅ Test Results Checklist

After running all tests, verify:

- [ ] Bot service starts successfully
- [ ] All teacher rooms have active bots
- [ ] Bots connect to Jitsi
- [ ] Lobby enabled in all rooms
- [ ] Teacher JWT generated successfully
- [ ] JWT has moderator: true
- [ ] Teacher auto-admitted to room
- [ ] Student placed in lobby
- [ ] Teacher receives lobby notification
- [ ] Teacher can admit students manually
- [ ] Bot auto-reconnects after failure
- [ ] New teachers get bots automatically
- [ ] Health endpoints respond correctly
- [ ] No errors in logs

## 🎉 Success!

If all tests pass, your system is ready for production deployment!

Next steps:
1. Deploy to production server
2. Update frontend to production API URLs
3. Monitor logs in production
4. Test with real teachers and students

---

**Questions or Issues?**
Check the main README.md or bot service logs for more details.
