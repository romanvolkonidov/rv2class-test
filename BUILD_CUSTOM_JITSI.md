# Building Custom Jitsi with Firebase Auth

## Plan

**User Flow:**
1. `/meet/roomname` → **Auth Page** (Google Firebase login)
2. After login → **Welcome Page** (shows user info + "Start" button)
3. Click "Start" → **Jitsi Prejoin** (original with video/audio)
4. Join → **Meeting**

## Steps

### 1. Create Custom Components (Styled like Jitsi)

**Files to create:**
- `react/features/auth/components/web/AuthPage.tsx` - Firebase Google login
- `react/features/auth/components/web/WelcomePage.tsx` - Welcome with Start button
- `react/features/auth/actions.ts` - Auth state management
- `react/features/auth/reducer.ts` - Auth reducer

### 2. Install Firebase

```bash
cd jitsi-custom/jitsi-meet
npm install firebase
```

### 3. Modify App Routing

Update `react/features/app/components/App.web.tsx` to check auth state:
- If not authenticated → show AuthPage
- If authenticated but not started → show WelcomePage  
- If started → show normal Jitsi flow (prejoin → meeting)

### 4. Build Jitsi

```bash
cd jitsi-custom/jitsi-meet
make
# or
npm run build
```

This will generate:
- `libs/app.bundle.min.js` (with our custom auth pages)
- CSS files
- All assets

### 5. Deploy to Server

```bash
# Copy built files to server
scp -r build/* root@108.61.245.179:/usr/share/jitsi-meet/
```

## Implementation Strategy

We'll copy Jitsi's `PreMeetingScreen` component structure and styling to ensure auth/welcome pages look identical to prejoin.

**Key Jitsi components to reuse:**
- `PreMeetingScreen` - Base layout
- `ActionButton` - Styled buttons
- Jitsi's CSS classes and theme

**Next:** Start implementing the auth components?
