# RV2Class-Test Complete Structure

## 📦 Project Overview

This is a **Jitsi Meet-based video conferencing app** with custom homework and student management features.

```
rv2class-test/
├── 🎯 CLIENT-SIDE (Jitsi React App)
│   └── jitsi-custom/jitsi-meet/
│
├── ⚙️ SERVER-SIDE (Deployment configs)
│   ├── Dockerfiles
│   ├── nginx configs
│   └── deployment scripts
│
└── 🔥 FIREBASE (Backend/Database)
    └── Uses Firebase Firestore for data
```

---

## 🎯 CLIENT-SIDE STRUCTURE

### Location: `/jitsi-custom/jitsi-meet/`

This is the **actual Jitsi Meet app** with your customizations:

```
jitsi-meet/
│
├── 📄 HTML Entry Points (static/)
│   ├── student-welcome.html          ← Student portal entry
│   ├── student-homework.html         ← Student homework list
│   ├── student-leaderboard.html      ← Student leaderboard (NEW)
│   ├── homework-quiz.html            ← Homework quiz interface
│   ├── homework-results.html         ← Homework results
│   ├── teacher-homework-details.html ← Teacher homework review (NEW)
│   ├── teacher-ratings.html          ← Teacher ratings dashboard (NEW)
│   ├── auth-page.html                ← Authentication
│   ├── landing-page.html             ← Landing page
│   ├── students.html                 ← Student management
│   └── index.html                    ← Main Jitsi room
│
├── ⚛️ React Components (react/features/)
│   │
│   ├── student-portal/
│   │   └── components/web/
│   │       ├── StudentWelcomePage.tsx      ← Logic & Firebase
│   │       └── StudentWelcome.tsx          ← UI (UPDATED with new design)
│   │
│   ├── homework/
│   │   └── components/web/
│   │       ├── StudentHomeworkList.tsx     ← Homework list (added leaderboard btn)
│   │       ├── StudentHomeworkPage.tsx     ← Homework page wrapper
│   │       ├── HomeworkQuizPage.tsx        ← Quiz interface
│   │       ├── HomeworkResultsPage.tsx     ← Results display
│   │       └── TeacherHomeworkReview.tsx   ← Teacher review interface
│   │
│   ├── base/                         ← Base Jitsi components
│   ├── conference/                   ← Conference room logic
│   ├── chat/                         ← Chat features
│   └── ...other Jitsi features
│
├── 🎨 Styles (css/)
│   ├── all.css                       ← Main styles
│   ├── homework-dark-glass.css       ← Homework features styling
│   └── ...other styles
│
├── ⚙️ Configuration
│   ├── config.js                     ← Jitsi config
│   ├── interface_config.js           ← UI config
│   ├── webpack.config.js             ← Build config
│   └── package.json                  ← Dependencies
│
└── 📦 Build Output (after npm run build)
    └── libs/
        ├── app.bundle.min.js         ← Main React app
        └── lib-jitsi-meet.min.js     ← Jitsi library
```

---

## ⚙️ SERVER-SIDE STRUCTURE

### Deployment Files (Root Level)

```
rv2class-test/
│
├── 🐳 Docker
│   ├── Dockerfile                    ← Main Jitsi container
│   ├── Dockerfile.jitsi              ← Jitsi-specific
│   └── Dockerfile.coturn             ← TURN server
│
├── 🌐 Nginx
│   └── nginx-fixed.conf              ← Nginx reverse proxy config
│
├── 🚀 Deployment Scripts
│   ├── deploy-to-vultr.sh            ← Deploy to Vultr
│   ├── deploy-jitsi-homework.sh      ← Deploy homework features
│   └── remove-nextjs-from-server.sh  ← Cleanup script
│
├── 🔧 Server Configs
│   ├── coturn.conf                   ← TURN server config
│   ├── fly.toml                      ← Fly.io config
│   └── fly-coturn.toml               ← Fly.io TURN config
│
└── 🔑 Credentials
    ├── firebase_config.js            ← Firebase config
    ├── key.json                      ← Service account key
    └── Y.env                         ← Environment variables
```

---

## 🔥 FIREBASE BACKEND

### Collections (Firestore)

```
Firestore Database:
│
├── students/                         ← Student profiles
│   └── {studentId}/
│       ├── name
│       ├── teacher
│       ├── teacherUid
│       └── subjects{}
│
├── homework/                         ← Homework assignments
├── telegramAssignments/              ← Telegram homework assignments
│
├── homeworkReports/                  ← Homework submissions
├── telegramHomeworkReports/          ← Telegram submissions
│
├── feedbacks/                        ← Student feedback/ratings
│   └── {feedbackId}/
│       ├── studentId
│       ├── lessonRating
│       ├── teacherRating
│       └── timestamp
│
└── teacherStudents/                  ← Teacher-specific students
```

---

## 🔄 How It All Works Together

### User Flow:

1. **Student visits**: `https://localhost:8080/student-welcome.html?student=ID`
2. **Webpack dev server** serves: `/jitsi-meet/static/student-welcome.html`
3. **HTML loads**: `app.bundle.min.js` (compiled React app)
4. **React renders**: `StudentWelcomePage.tsx` → `StudentWelcome.tsx`
5. **Firebase**: Fetches student data from Firestore
6. **Display**: Shows welcome page with homework count, join button

### Build Process:

```bash
# Development (webpack-dev-server)
cd jitsi-custom/jitsi-meet
npm start                    # Runs on localhost:8080

# Production Build
npm run build                # Creates libs/app.bundle.min.js

# Deploy
./deploy-to-vultr.sh        # Deploys to Vultr VPS
```

---

## 📝 Recent Changes (Your Session)

### What We Modified:

1. **✅ StudentWelcome.tsx** (React Component)
   - Location: `jitsi-meet/react/features/student-portal/components/web/StudentWelcome.tsx`
   - Changed: Purple gradients → Teal/cyan gradients
   - Added: Glass-morphism design, animated background orbs, teacher info card
   - This IS being used by your app ✓

2. **✅ teacher-homework-details.html** (New Page)
   - Location: `jitsi-meet/static/teacher-homework-details.html`
   - Shows: Detailed homework results for specific student
   - Features: Question-by-question review, rating/feedback modal

3. **✅ teacher-ratings.html** (New Page)
   - Location: `jitsi-meet/static/teacher-ratings.html`
   - Shows: All students ranked by homework performance
   - Features: Medal icons, progress bars, statistics

4. **✅ student-leaderboard.html** (New Page)
   - Location: `jitsi-meet/static/student-leaderboard.html`
   - Shows: Student view of peer rankings
   - Features: Amber theme, highlights current student

5. **✅ StudentHomeworkList.tsx** (Modified)
   - Location: `jitsi-meet/react/features/homework/components/web/StudentHomeworkList.tsx`
   - Added: Leaderboard button (line 193)

---

## 🎨 Design System

### Color Schemes:

**Teacher Pages:**
```css
/* Teal/Blue gradients */
background: linear-gradient(135deg, #06b6d4, #0ea5e9, #3b82f6);
```

**Student Pages:**
```css
/* Amber/Yellow gradients */
background: linear-gradient(135deg, #eab308, #fbbf24);
```

**Glass-morphism:**
```css
background: rgba(30, 41, 59, 0.7);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

---

## 🚀 Making Changes

### When modifying CLIENT-SIDE (UI/Features):

**✅ CORRECT:**
- Edit files in: `jitsi-custom/jitsi-meet/`
- HTML pages: `static/*.html`
- React components: `react/features/**/*.tsx`
- Styles: `css/*.css`

**❌ WRONG:**
- DO NOT create files in: `jitsi-custom/*.html` (root level)

### When modifying SERVER-SIDE (Deployment):

**✅ CORRECT:**
- Edit root level files:
  - `Dockerfile*`
  - `nginx-fixed.conf`
  - `deploy-*.sh`
  - `coturn.conf`

### Verification:

Run before committing:
```bash
./check-file-locations.sh
```

---

## 🎯 Quick Reference

**Start dev server:**
```bash
cd jitsi-custom/jitsi-meet
npm start
# Access: https://localhost:8080
```

**Access pages:**
- Student Welcome: `/student-welcome.html?student=ID`
- Student Homework: `/student-homework.html?studentId=ID`
- Student Leaderboard: `/student-leaderboard.html?student=ID`
- Teacher Homework Details: `/teacher-homework-details.html?homework=HW_ID&student=S_ID&report=R_ID`
- Teacher Ratings: `/teacher-ratings.html`

**Deploy to production:**
```bash
./deploy-to-vultr.sh
```

---

## 📌 Key Principles

1. **CLIENT = jitsi-meet folder** (React app + HTML pages)
2. **SERVER = Root level configs** (Docker, nginx, deploy scripts)
3. **BACKEND = Firebase** (No custom server code needed)
4. **All changes must be in jitsi-meet folder** to take effect
5. **Run check-file-locations.sh** to verify structure
