# Homework System Implementation Plan

## 🎯 Overview
Implement a complete homework system in Jitsi style for students to:
- View assigned homework
- Complete homework assignments
- Check results and scores
- Teachers to create and grade homework

## 📋 Required Pages (Jitsi Style)

### 1. **Student Homework List** (`/student-homework/{studentId}`)
✅ **CREATED**: `student-homework.html`
- Shows all assigned homework
- Status badges (Pending/Completed)
- Scores for completed homework
- Click to start or view results

### 2. **Do Homework Page** (`/do-homework/{studentId}/{homeworkId}`)
⏳ **TODO**: Create `do-homework.html`
- Load questions from topic
- Show question types: multiple choice, fill-in-blank, text answer
- Media support (images, audio, video)
- Submit answers
- Save to `telegramHomeworkReports` collection

### 3. **Homework Results** (`/homework-results/{studentId}/{homeworkId}`)
⏳ **TODO**: Create `homework-results.html`
- Show score (correct/total)
- Review each question
- Show correct vs student's answer
- Green/red indicators

### 4. **Teacher Homework Manager** (`/teacher-homework`)
⏳ **TODO**: Create `teacher-homework.html`
- List all students
- Assign topics as homework
- View student submissions
- Grade homework

## 📊 Firebase Collections

### Existing Collections (from Next.js app):

```javascript
// telegramAssignments
{
  id: string,
  studentId: string,
  topicId: string,
  topicIds: string[],
  courseId: string,
  chapterId: string,
  assignedAt: timestamp,
  status: string,
  courseName: string,
  chapterName: string,
  topicName: string,
  homeworkMediaFiles: Array<{filename, url, type}>
}

// telegramHomeworkReports
{
  id: string,
  studentId: string,
  homeworkId: string,
  score: number,
  completedAt: timestamp,
  submittedAnswers: object,
  correctAnswers: number,
  totalQuestions: number,
  seenByTeacher: boolean
}

// telegramTopics (questions)
{
  id: string,
  topicId: string,
  text: string,
  sentence: string,
  question: string,
  options: string[],
  correctAnswer: string | number,
  type: string, // 'multipleChoice', 'fillInBlank', 'textAnswer'
  mediaFiles: Array<{filename, url, type}>,
  explanation: string
}
```

## 🎨 Jitsi Styling Guidelines

All pages must use:
- **Background**: `#1E1E1E`
- **Cards**: `#292929`
- **Primary Button**: `#3D7CC9` (hover: `#4A8BD6`)
- **Text Primary**: `#E7E7E7`
- **Text Secondary**: `#A4B5B8`
- **Borders**: `#525A5E`
- **Success**: `#31B76F`
- **Error**: `#E15350`

## 🔗 URL Routes to Add to Nginx

```nginx
# Student homework list
location ~ ^/student-homework/([a-zA-Z0-9_-]+)$ {
    root /usr/share/jitsi-meet;
    charset utf-8;
    try_files /student-homework.html =404;
}

# Do homework
location ~ ^/do-homework/([a-zA-Z0-9_-]+)/([a-zA-Z0-9_-]+)$ {
    root /usr/share/jitsi-meet;
    charset utf-8;
    try_files /do-homework.html =404;
}

# Homework results
location ~ ^/homework-results/([a-zA-Z0-9_-]+)/([a-zA-Z0-9_-]+)$ {
    root /usr/share/jitsi-meet;
    charset utf-8;
    try_files /homework-results.html =404;
}

# Teacher homework manager
location = /teacher-homework {
    root /usr/share/jitsi-meet;
    charset utf-8;
    try_files /teacher-homework.html =404;
}
```

## 🚀 Implementation Steps

### Phase 1: Student View ✅ IN PROGRESS
1. ✅ Create homework list page
2. ⏳ Create do-homework page
3. ⏳ Create results page
4. ⏳ Add homework link to student welcome page

### Phase 2: Teacher View
1. Create teacher homework manager
2. Assign homework to students
3. View submissions
4. Grade and add feedback

### Phase 3: Enhancements
1. Add notifications
2. Homework due dates
3. Automatic grading
4. Statistics dashboard

## 💡 Next Steps

To complete the homework system:

1. **Link from student welcome page**:
   - Add "My Homework" button on `student-welcome.html`

2. **Create do-homework.html**:
   - Load questions from Firestore (`telegramTopics`)
   - Render question types dynamically
   - Handle media (images, audio, video)
   - Submit answers to `telegramHomeworkReports`

3. **Create homework-results.html**:
   - Load report from `telegramHomeworkReports`
   - Load original questions
   - Compare answers
   - Show score and feedback

4. **Add nginx routes**

5. **Deploy all files**

## 📝 Notes

- Reusing existing Firebase collections from Next.js app
- All styling matches Jitsi perfectly
- Mobile-responsive design
- Same authentication flow (Firebase Auth)

---

**Status**: Student homework list page created ✅
**Next**: Create do-homework and results pages, then deploy
