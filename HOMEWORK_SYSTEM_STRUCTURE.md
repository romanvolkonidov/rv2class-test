# Homework System Structure - Clean and Cohesive

## ✅ Current Structure (All Files in Use)

### Entry Points (index.web.js)
- `STUDENT_HOMEWORK` → StudentHomeworkApp
- `HOMEWORK_QUIZ` → HomeworkQuizApp  
- `HOMEWORK_RESULTS` → HomeworkResultsApp
- `TEACHER_HOMEWORK` → TeacherHomeworkPage
- `STUDENT_LEADERBOARD` → StudentLeaderboardPage
- `TEACHER_STUDENTS` → TeacherStudentsPage

### HTML Files (All Unique)

**Student Pages:**
- `/static/student-welcome.html` → STUDENT_PORTAL entry point
- `/static/student-homework.html` → STUDENT_HOMEWORK entry point (homework list)
- `/static/homework-quiz.html` → HOMEWORK_QUIZ entry point (take quiz)
- `/static/homework-results.html` → HOMEWORK_RESULTS entry point (view results)

**Teacher Pages:**
- `/teacher-homework.html` → TEACHER_HOMEWORK entry point (assign homework)
- `/students.html` → TEACHER_STUDENTS entry point (view students list)

### React Components (All Used)

**Homework Feature (`/react/features/homework/components/web/`):**

1. **Student Homework List:**
   - `StudentHomeworkApp.tsx` - App wrapper
   - `StudentHomeworkPage.tsx` - Data loader & state manager
   - `StudentHomeworkList.tsx` - UI component

2. **Homework Quiz:**
   - `HomeworkQuizApp.tsx` - App wrapper
   - `HomeworkQuizPage.tsx` - Data loader & state manager  
   - `HomeworkQuiz.tsx` - UI component (supports multiple choice & text answers)

3. **Homework Results:**
   - `HomeworkResultsApp.tsx` - App wrapper
   - `HomeworkResultsPage.tsx` - Data loader & state manager
   - `HomeworkResults.tsx` - UI component (shows "Ваш ответ" badge)

### CSS Files

**Source:** `/react/features/homework/css/homework.css`
**Public:** `/css/homework.css` (copy of source)

**Theme:** Dark Jitsi MUI theme
- Background: `#1E1E1E`
- Cards: `#292929`
- Text: `#E7E7E7`
- Primary: `#3D7CC9`
- Borders: `#3A3A3A`

### Question Types Supported

1. **Multiple Choice** (`type: 'multiple_choice' | 'multipleChoice'`)
   - Shows options as buttons
   - Highlights correct/incorrect answers
   - Shows "Ваш ответ" and "Правильный ответ" badges

2. **Text Answer** (`type: 'text' | 'textAnswer' | 'fillInBlank'`)
   - Shows textarea input
   - Compares answer strings (case-insensitive)
   - Shows user answer and correct answer separately

### Data Flow

```
Student Welcome Page
  ↓ Click "Домашние задания"
Student Homework List (with red badge for uncompleted)
  ↓ Click "Начать" or "Посмотреть результаты"
Homework Quiz OR Homework Results
  ↓ Submit or Back
Student Homework List
```

### Firebase Collections Used

- `students` / `teacherStudents` - Student data
- `telegramAssignments` - Homework assignments
- `telegramQuestions` - Questions (filtered by `topicId`)
- `telegramHomeworkReports` - Submission reports with `submittedAnswers[]`

### Key Features

✅ Dark theme (Jitsi MUI style)
✅ Logo integration (`logo-white-tight.png`)
✅ Red badge on homework button showing uncompleted count
✅ Support for multiple choice and open text questions
✅ Media support (images, audio, video)
✅ "Ваш ответ" badge visible on wrong answers
✅ "Правильный ответ" badge on correct answers
✅ Navigation with /static/ prefix
✅ Firebase compat API integration
✅ Responsive design

## ❌ No Duplicates Found

- No old `student-homework` folder
- No duplicate entry points
- No unused component files
- Single CSS source with public copy
- All HTML files are unique and serve different purposes

## 🔄 Build Process

When changes are made to React components or CSS:
1. Edit source files in `/react/features/homework/`
2. Copy CSS: `cp react/features/homework/css/homework.css css/homework.css`
3. Build: `make` (compiles React to bundle.js)
4. Hard refresh browser: Ctrl+Shift+R (clear cache)

## ✨ All pages are cohesive with consistent:
- Dark Jitsi MUI theme
- Logo placement
- Navigation patterns
- Error handling
- Firebase integration
- Typography and spacing
