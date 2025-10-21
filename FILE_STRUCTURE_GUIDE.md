# RV2Class-Test File Structure Guide

## ⚠️ IMPORTANT: Correct File Locations

### 🎯 **ACTUAL APP LOCATION**
All real app files are in: **`/jitsi-custom/jitsi-meet/`**

```
jitsi-custom/
└── jitsi-meet/           ← THE REAL APP IS HERE
    ├── static/           ← HTML pages served by webpack
    ├── react/            ← React components
    ├── config.js
    └── webpack.config.js
```

### ❌ **DO NOT CREATE FILES IN WRONG LOCATIONS**
- `/jitsi-custom/*.html` ← **WRONG! Don't create files here**
- Root level HTML files are NOT used by the app

---

## 📁 Correct File Locations

### HTML Pages (Standalone)
Location: `/jitsi-custom/jitsi-meet/static/`

These are thin HTML wrappers that load the React app:
- `student-welcome.html` - Student portal entry
- `student-homework.html` - Student homework list
- `student-leaderboard.html` - Student leaderboard view
- `homework-quiz.html` - Homework quiz interface
- `homework-results.html` - Homework results page
- `teacher-homework-details.html` - Teacher views student homework details
- `teacher-ratings.html` - Teacher views all students' ratings
- `auth-page.html` - Authentication
- `landing-page.html` - Landing page
- etc.

### React Components
Location: `/jitsi-custom/jitsi-meet/react/features/`

```
react/features/
├── student-portal/
│   └── components/web/
│       ├── StudentWelcomePage.tsx ← Main student welcome logic
│       └── StudentWelcome.tsx     ← UI component with styling
├── homework/
│   └── components/web/
│       ├── StudentHomeworkList.tsx
│       ├── StudentHomeworkPage.tsx
│       ├── HomeworkQuizPage.tsx
│       ├── HomeworkResultsPage.tsx
│       └── TeacherHomeworkReview.tsx
└── ...
```

---

## 🔗 How It Works

### HTML → React Flow
1. User visits: `https://localhost:8080/student-welcome.html?student=ID`
2. Webpack serves: `/jitsi-custom/jitsi-meet/static/student-welcome.html`
3. HTML loads: `app.bundle.min.js` (React app)
4. React renders: `StudentWelcomePage.tsx` component

---

## 📋 Recent Changes (October 21, 2025)

### ✅ Implemented Features
1. **Teacher Homework Details Page** (`/teacher-homework-details.html`)
   - Location: `/jitsi-custom/jitsi-meet/static/teacher-homework-details.html`
   - Shows detailed results for a specific student's homework
   - Includes rating/feedback modal

2. **Teacher Ratings Leaderboard** (`/teacher-ratings.html`)
   - Location: `/jitsi-custom/jitsi-meet/static/teacher-ratings.html`
   - Shows all students ranked by homework performance

3. **Student Leaderboard** (`/student-leaderboard.html`)
   - Location: `/jitsi-custom/jitsi-meet/static/student-leaderboard.html`
   - Student view of peer comparison
   - Linked from: `StudentHomeworkList.tsx` (line 193)

4. **Student Welcome Page Redesign**
   - Modified: `/jitsi-custom/jitsi-meet/react/features/student-portal/components/web/StudentWelcome.tsx`
   - New design: Glass-morphism with teal/cyan gradients
   - Animated background orbs
   - Teacher info card

### 🗑️ Cleanup Performed
- Deleted all standalone HTML files from `/jitsi-custom/` root
- Moved 3 new pages to correct location: `/jitsi-custom/jitsi-meet/static/`
- Prevented future confusion by removing duplicate files

---

## 🚀 Deployment

When deployed to Vultr:
- Only `/jitsi-custom/jitsi-meet/` folder is deployed
- All files in correct locations will work
- No confusion with duplicate files

---

## 🎨 Design System

### Teacher Pages
- Colors: Teal (#06b6d4), Sky Blue (#0ea5e9), Blue (#3b82f6)
- Gradients: `linear-gradient(135deg, #06b6d4, #0ea5e9, #3b82f6)`

### Student Pages
- Colors: Amber (#eab308), Yellow (#fbbf24)
- Gradients: `linear-gradient(135deg, #eab308, #fbbf24)`

### Common Elements
- Glass-morphism: `backdrop-filter: blur(20px)`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Background: `rgba(30, 41, 59, 0.7)`

---

## ⚡ Quick Reference

### Adding a New HTML Page
1. Create in: `/jitsi-custom/jitsi-meet/static/YOUR-PAGE.html`
2. Access at: `https://localhost:8080/YOUR-PAGE.html`

### Adding a New React Component
1. Create in: `/jitsi-custom/jitsi-meet/react/features/YOUR-FEATURE/components/web/YourComponent.tsx`
2. Import in parent component or register as entry point

### Linking Between Pages
Use absolute paths:
```javascript
window.location.href = `/page-name.html?param=value`;
```

---

## 📝 Notes
- All HTML pages use Firebase SDK v10.7.1
- Color scheme matches Jitsi theme (teal/blue for teachers)
- Student features use amber/yellow theme
- All new pages follow glass-morphism design pattern
