# RV2Class Page Flow Explanation

## Current Page Structure

### 1. **Root `/` (index.html)**
- **Purpose**: Entry point
- **Action**: Redirects to `/auth-page.html`
- **Design**: Minimal (just redirects)

### 2. **Auth Page `/auth-page.html`**
- **Purpose**: Google Sign In
- **Design**: **Black Jitsi-styled** authentication page
- **Features**:
  - RV2Class logo
  - "Continue with Google" button
  - Firebase authentication
- **After login**: Redirects to `/landing.html`

### 3. **Landing Page `/landing.html`** (Teacher Dashboard)
- **Purpose**: Teacher's main dashboard
- **Design**: **Black Jitsi-styled** with gradient buttons
- **Features**:
  - User profile display
  - **"Start Meeting"** button (purple gradient)
  - **"Students"** button (green gradient)  
  - **"Homeworks"** button (orange gradient) ← **THIS IS WHERE THE BUTTON IS**
  - Unread homework badge
  - Sign out button
- **Navigation**:
  - "Start Meeting" → Goes to `/meet/{roomName}`
  - "Students" → Goes to `/students.html`
  - "Homeworks" → Goes to `/teacher-homeworks.html`

### 4. **Students Page `/students.html`**
- **Purpose**: Manage students
- **Design**: Matches Jitsi's black theme
- **Features**: Student list, search, filter

### 5. **Teacher Homeworks `/teacher-homeworks.html`**
- **Purpose**: Review student homework submissions
- **Design**: Matches Jitsi's black theme
- **Features**:
  - Filter by status (unreviewed, all, completed)
  - View submissions
  - Mark as reviewed

### 6. **Meeting Interface `/meet/{roomName}`**
- **Purpose**: Actual video conference
- **Design**: **Jitsi's standard black meeting interface**
- **Features**: This is the ACTUAL Jitsi Meet React app
  - Video/audio controls
  - Chat
  - Participants panel
  - Screen sharing
  - **Note**: This is where the lobby system works

## Where Are You Looking?

Based on your description "black Jitsi styled auth page", you're seeing:

**Option A**: `/auth-page.html` 
- Shows Google Sign In
- **NO Homeworks button here** (this is before login)

**Option B**: `/landing.html`
- Shows AFTER login
- **HAS Homeworks button** (orange, below Start Meeting and Students)

**Option C**: `/meet/{roomName}`
- The actual meeting interface
- **NO Homeworks button** (this is inside a meeting)

## Expected Flow for Teacher

```
1. Go to `/`
   ↓
2. Redirects to `/auth-page.html`
   ↓
3. Click "Continue with Google"
   ↓
4. Firebase authentication
   ↓
5. Redirects to `/landing.html` ← **HOMEWORKS BUTTON IS HERE**
   ↓
6. Teacher sees:
   - Profile info
   - [Start Meeting] button
   - [Students] button
   - [Homeworks] button ← **LOOK FOR THIS**
   - [Sign out]
```

## Troubleshooting

### If you DON'T see the Homeworks button on landing.html:

1. **Check browser console** for JavaScript errors
2. **Verify you're logged in** (should see your Google profile photo)
3. **Check if actionButtons div is visible** (contains all 3 buttons)
4. **Look for the orange button** below the purple and green ones

### If you're looking at the WRONG page:

- `/auth-page.html` = Login page (NO buttons, just Google Sign In)
- `/landing.html` = Dashboard page (HAS Homeworks button)
- `/meet/room` = Meeting interface (NO Homeworks button)

## Design System

All our pages use **Jitsi's design tokens**:
- Background: `#1E1E1E` (dark gray, almost black)
- Cards: `#292929` (slightly lighter)
- Text: `#E7E7E7` (light gray)
- Primary: `#667eea` (purple/blue gradient)
- Success: `#10b981` (green)
- Warning: `#f59e0b` (orange - Homeworks button)

This ensures all pages look cohesive with Jitsi's interface.
