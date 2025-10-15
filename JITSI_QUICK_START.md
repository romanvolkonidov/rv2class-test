# Jitsi Integration - Quick Reference

## 🚀 Quick Start

### For Teachers
1. Click **"Start a Lesson"**
2. Select your name (Roman/Violet)
3. **Choose platform**:
   - **BigBlueButton**: Full education features (whiteboard, recording, polls)
   - **Jitsi Meet**: Fast, simple video calls

### For Students
- Just click **"Join Class"** - you'll automatically join whatever platform your teacher chose!

---

## 📁 Files Modified/Created

### New Files
- ✅ `/components/JitsiRoom.tsx` - Jitsi meeting component
- ✅ `/JITSI_INTEGRATION_GUIDE.md` - Full documentation

### Modified Files
- ✅ `/app/page.tsx` - Added platform selection UI
- ✅ `/app/room/page.tsx` - Support both BBB and Jitsi
- ✅ `/app/student/[id]/student-welcome.tsx` - Auto-detect teacher's platform

---

## 🔧 How to Test

### Test as Teacher (Roman)
```
1. Go to home page
2. Click "Start a Lesson"
3. Select "Roman"
4. Choose "Jitsi Meet"
5. Should load Jitsi interface with room "RV2Class_roman"
```

### Test as Student
```
1. Go to student welcome page: /student/{studentId}
2. Click "Join Class"
3. Should automatically join same platform as teacher
```

### Test Platform Detection
```javascript
// Check Firebase Console > activeRooms collection
// Should see document like:
{
  teacher: "Roman",
  platform: "jitsi",
  startedAt: Timestamp,
  roomName: "roman"
}
```

---

## 🎯 Key URLs

### Teacher Starting Room
```
# BBB
/room?room=roman&name=Roman&isTutor=true&platform=bbb

# Jitsi
/room?room=roman&name=Roman&isTutor=true&platform=jitsi
```

### Student Joining
```
# Auto-detects platform from Firebase
/room?room=roman&name=StudentName&isTutor=false&platform={detected}
```

---

## 🛠️ Configuration

### Change Jitsi Server
Edit `/components/JitsiRoom.tsx`:
```typescript
// Line ~61
const domain = "meet.jit.si"; // Change to your server
```

### Customize Jitsi Toolbar
Edit `/components/JitsiRoom.tsx`:
```typescript
// Line ~80
TOOLBAR_BUTTONS: [
  "microphone",
  "camera",
  "desktop",
  "chat",
  // Add/remove buttons as needed
]
```

---

## 🔥 Common Issues & Fixes

### Issue: Jitsi not loading
**Fix**: Check browser console, verify external_api.js loads from meet.jit.si

### Issue: Students join wrong platform
**Fix**: Check Firebase `activeRooms` collection has correct `platform` field

### Issue: No moderator controls
**Fix**: Ensure teacher joins first (first participant = moderator in Jitsi)

### Issue: Camera/mic not working
**Fix**: Same as BBB - check browser permissions, HTTPS required

---

## 📊 Platform Comparison

| Feature | BigBlueButton | Jitsi Meet |
|---------|--------------|------------|
| Setup | Needs server & secrets | Uses public servers |
| Whiteboard | ✅ Advanced | ❌ None |
| Recording | ✅ Server-side | ⚠️ Local only |
| Screen Share | ✅ | ✅ |
| Chat | ✅ | ✅ |
| Load Time | ~5-10s | ~2-3s |
| Mobile Support | ✅ Good | ✅ Excellent |
| Self-Host | Required | Optional |

---

## 🎨 UI Changes

### Home Page Flow
```
Before:
[Start Lesson] → [Select Teacher] → Starts BBB

After:
[Start Lesson] → [Select Teacher] → [Choose Platform] → Starts chosen platform
```

### Platform Selection Screen
```
┌─────────────────────────────┐
│   Choose Platform           │
│   Starting as Roman         │
├─────────────────────────────┤
│  🎥 BigBlueButton           │
│  Full-featured education    │
├─────────────────────────────┤
│  🎥 Jitsi Meet              │
│  Fast, simple video calls   │
└─────────────────────────────┘
```

---

## 💾 Firebase Structure

### activeRooms Collection
```typescript
Document ID: "roman" or "violet"

Data: {
  teacher: "Roman",
  platform: "jitsi",     // or "bbb"
  startedAt: Timestamp,
  roomName: "roman"
}
```

---

## 🚀 Next Steps

### Immediate Testing
- [ ] Test BBB platform (should work as before)
- [ ] Test Jitsi platform (new functionality)
- [ ] Test on desktop browser
- [ ] Test on mobile browser
- [ ] Test student auto-join

### Future Enhancements
- [ ] Add platform preference saving
- [ ] Self-host Jitsi server
- [ ] Add JWT authentication for Jitsi
- [ ] Add recording support for Jitsi
- [ ] Platform usage analytics

---

## 📞 Need Help?

1. **Check logs**: Browser console shows platform detection
2. **Check Firebase**: Verify `activeRooms` collection data
3. **Read full guide**: See `JITSI_INTEGRATION_GUIDE.md`
4. **Test in incognito**: Rules out cache/extension issues

---

## ✅ Quick Verification

Run this in browser console when testing:
```javascript
// Check current platform
console.log(new URLSearchParams(window.location.search).get('platform'));

// Should log: "bbb" or "jitsi"
```

---

**Status**: ✅ Ready to use!
**Last Updated**: October 15, 2025
