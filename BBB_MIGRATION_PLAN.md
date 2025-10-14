# BigBlueButton Migration Plan

## Overview
Complete migration from LiveKit to BigBlueButton (BBB) for the rv2class tutoring platform.

## Current Architecture (LiveKit)
- Frontend: Next.js with `@livekit/components-react`
- Token generation: `/api/livekit-token`
- Room management: Custom Firebase-based system
- Features: Video, audio, screen sharing, whiteboard (Excalidraw), annotations, chat
- Audio processing: DeepFilter agent (separate service)

## Target Architecture (BigBlueButton)

### Phase 1: BBB Server Setup (REQUIRED FIRST)
**You need to install BBB on a server before we can integrate it.**

#### Option A: Quick Docker Setup (Development/Testing)
```bash
# On a Linux server with Docker
git clone https://github.com/bigbluebutton/docker
cd docker
./scripts/setup
```

#### Option B: Production Installation (Recommended)
Requirements:
- Ubuntu 20.04 or 22.04 LTS (64-bit)
- Minimum 8GB RAM, 4 CPU cores
- 500GB disk space
- Public IP with domain name
- Ports: 80, 443, 16384-32768 UDP

```bash
# Install BBB 2.7 (latest stable)
wget -qO- https://ubuntu.bigbluebutton.org/bbb-install-2.7.sh | bash -s -- -w -v focal-270 -s YOUR_DOMAIN -e YOUR_EMAIL
```

#### Option C: Cloud Hosting Services
- **Scalelite**: For load balancing multiple BBB servers
- **Hosted providers**: 
  - blindsidenetworks.com (official)
  - bigbluebutton.hosting
  - educonf.io

### Phase 2: Backend Integration

#### Step 1: Install BBB JavaScript SDK
```bash
npm install bigbluebutton-js
npm uninstall @livekit/components-react @livekit/components-styles livekit-client livekit-server-sdk
```

#### Step 2: Create BBB API Service
**File: `lib/bbb.ts`** (New)
- BBB API wrapper
- Meeting creation
- Join URL generation
- Recording management

#### Step 3: Replace API Endpoints
- `/api/livekit-token` → `/api/bbb-join`
- `/api/check-room` → `/api/bbb-meetings`
- `/api/close-room` → `/api/bbb-end`
- Keep Firebase structure for student/teacher management

### Phase 3: Frontend Integration

#### Step 1: Remove LiveKit Components
Files to modify:
- `app/room/page.tsx` - Main room component
- `components/CustomVideoConference.tsx` - Replace with BBB iframe
- `components/CustomControlBar.tsx` - Remove (BBB has built-in controls)
- `components/CompactParticipantView.tsx` - Remove (BBB handles this)

#### Step 2: BBB Integration Methods

**Method A: Full Iframe Embed** (Simplest)
- Embed entire BBB interface in iframe
- Lose custom UI but gain all BBB features
- Quick implementation

**Method B: Custom UI with BBB Backend** (Complex)
- Use BBB API + WebRTC directly
- Keep custom Excalidraw whiteboard
- More control but much more work
- May require BBB plugin development

**Method C: Hybrid Approach** (Recommended)
- BBB iframe for video/audio
- Keep separate Excalidraw whiteboard
- Use BBB's presentation mode for PDFs
- Communicate via PostMessage API

#### Step 3: Features Mapping

| Current Feature | BBB Equivalent | Action |
|----------------|----------------|--------|
| Video/Audio | Built-in | ✅ Use BBB |
| Screen Share | Built-in | ✅ Use BBB |
| Chat | Built-in | ✅ Use BBB |
| Whiteboard | Excalidraw (custom) | 🔄 Keep OR use BBB whiteboard |
| Annotations | Custom overlay | 🔄 Use BBB whiteboard instead |
| Translation | Custom overlay | ⚠️ Keep as separate feature |
| Join Requests | Custom (Firebase) | ⚠️ Keep OR use BBB guest policy |
| Audio Enhancement | DeepFilter | ❌ Remove (BBB handles audio) |

### Phase 4: Data Migration

#### Firebase Collections to Keep:
- `teachers` - User authentication
- `students` - Student records
- `lessons` - Lesson tracking
- `homework` - Homework management

#### Firebase Collections to Modify:
- `joinRequests` - May not be needed with BBB
- Room state tracking - Use BBB API instead

### Phase 5: Audio Processing

**Important:** BBB has built-in audio processing (WebRTC noise suppression). 
Your DeepFilter agent can be:
1. **Removed** - Use BBB's built-in audio
2. **Kept as optional** - For advanced users who want extra noise cancellation
3. **Integrated** - Proxy BBB audio through DeepFilter (complex)

**Recommendation:** Remove DeepFilter to simplify architecture.

## Implementation Order

### Week 1: Server Setup
- [ ] Provision BBB server
- [ ] Configure domain and SSL
- [ ] Test basic meeting creation
- [ ] Set up recordings storage

### Week 2: Backend Development
- [ ] Create `lib/bbb.ts` API wrapper
- [ ] Implement `/api/bbb-join` endpoint
- [ ] Implement `/api/bbb-meetings` endpoint
- [ ] Test meeting lifecycle

### Week 3: Frontend - Basic Integration
- [ ] Create `components/BBBRoom.tsx`
- [ ] Implement iframe embed
- [ ] Handle join flow
- [ ] Test video/audio

### Week 4: Frontend - Feature Parity
- [ ] Integrate whiteboard decision (BBB vs Excalidraw)
- [ ] Implement recording access
- [ ] Update UI for BBB controls
- [ ] Mobile testing

### Week 5: Testing & Deployment
- [ ] End-to-end testing
- [ ] Load testing
- [ ] Student/teacher beta testing
- [ ] Production deployment

## Breaking Changes for Users

1. **Different UI**: BBB interface looks different from LiveKit
2. **Join Process**: May be slightly different flow
3. **Browser Requirements**: BBB requires modern browsers
4. **Mobile Apps**: BBB has its own mobile apps

## Advantages You'll Gain

1. ✅ **Reliability**: Rock-solid connection stability
2. ✅ **Built-in Whiteboard**: Collaborative, multi-user
3. ✅ **Presentation Mode**: Upload PDFs/slides
4. ✅ **Recording**: Server-side with professional playback
5. ✅ **Polling**: Quick quizzes during lessons
6. ✅ **Breakout Rooms**: For group classes
7. ✅ **Shared Notes**: Collaborative note-taking
8. ✅ **Better Analytics**: Track student engagement

## Disadvantages to Consider

1. ⚠️ **Heavier**: More server resources needed
2. ⚠️ **Less Customizable UI**: Harder to brand
3. ⚠️ **Learning Curve**: Different API paradigm
4. ⚠️ **Initial Setup**: More complex installation

## Cost Estimate

### Self-Hosted:
- **Server**: $40-80/month (DigitalOcean, Hetzner, AWS)
- **Storage**: $10-20/month (for recordings)
- **Total**: ~$60-100/month

### Hosted Provider:
- **Per concurrent user**: $0.10-0.50/hour
- **Estimated**: $100-500/month depending on usage

## Next Steps

**DECISION NEEDED:**
1. Do you want to self-host or use a hosted provider?
2. Do you want to keep Excalidraw or switch to BBB whiteboard?
3. How much custom UI do you want vs using BBB's interface?

**LET ME KNOW AND I'LL START IMPLEMENTATION!**

---

## Quick Start Commands (For Self-Hosting)

```bash
# 1. Install BBB on Ubuntu server
wget -qO- https://ubuntu.bigbluebutton.org/bbb-install-2.7.sh | bash -s -- -w -v focal-270 -s tutoring.yourdomain.com -e your@email.com

# 2. Get BBB credentials
bbb-conf --secret

# 3. Set environment variables in your Next.js app
BBB_URL=https://tutoring.yourdomain.com/bigbluebutton/
BBB_SECRET=your_secret_from_step_2
```
