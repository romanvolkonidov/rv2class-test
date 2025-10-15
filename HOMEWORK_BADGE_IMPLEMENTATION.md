# Homework Badge System - Implementation Plan

## Summary of Changes

### 1. Student Badge - Red badge showing uncompleted homework count
- Location: `/app/student/[id]/student-welcome.tsx`
- Shows number of pending (not completed) homework assignments

### 2. Teacher Homework View - New page to see all completed homeworks
- Location: `/app/teacher/homeworks/page.tsx` (NEW FILE)
- Shows all completed homeworks from all students
- Latest submissions on top
- Indicates which student submitted each

### 3. Teacher Badge - Shows unseen homework count
- Location: `/app/students/page.tsx`
- Shows number of homework submissions not yet viewed by teacher
- Track "seenByTeacher" field in homework reports

## Implementation Steps

### Step 1: Add `seenByTeacher` field to homework reports
Update `lib/firebase.ts` to add this field when creating reports

### Step 2: Create function to count uncompleted assignments
Add to `lib/firebase.ts`:
```typescript
export const countUncompletedHomework = async (studentId: string): Promise<number> => {
  const assignments = await fetchStudentHomework(studentId);
  const reports = await fetchHomeworkReports(studentId);
  
  const completedIds = new Set(reports.map(r => r.homeworkId));
  const uncompleted = assignments.filter(a => !completedIds.has(a.id));
  
  return uncompleted.length;
};
```

### Step 3: Create function to count unseen homeworks
Add to `lib/firebase.ts`:
```typescript
export const countUnseenHomeworks = async (): Promise<number> => {
  const reportsRef = collection(db, "telegramHomeworkReports");
  const q = query(reportsRef, where("seenByTeacher", "==", false));
  const snapshot = await getDocs(q);
  return snapshot.size;
};
```

### Step 4: Create function to fetch all homework reports
Add to `lib/firebase.ts`:
```typescript
export const fetchAllHomeworkReports = async (): Promise<HomeworkReport[]> => {
  const reportsRef = collection(db, "telegramHomeworkReports");
  const q = query(reportsRef, orderBy("completedAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as HomeworkReport));
};
```

### Step 5: Update student welcome page with badge
In `/app/student/[id]/student-welcome.tsx`:
- Fetch uncompleted count on load
- Add badge to homework button

### Step 6: Create teacher homework view page
New file: `/app/teacher/homeworks/page.tsx`
- List all completed homeworks
- Show student name for each
- Show score, date, etc.
- Click to view details
- Mark as "seen"

### Step 7: Add badge to teacher's students page
In `/app/students/page.tsx`:
- Add "Homeworks" button with badge
- Badge shows unseen count

## Files to Modify

1. ✅ `/lib/firebase.ts` - Add new functions
2. ✅ `/app/student/[id]/student-welcome.tsx` - Add badge to button
3. ✅ `/app/students/page.tsx` - Add Homeworks button with badge
4. ✅ `/app/teacher/homeworks/page.tsx` - NEW FILE

## Next Steps

Run these commands to implement:
1. Update firebase.ts with new functions
2. Update student welcome page
3. Create teacher homeworks page
4. Update students page with homework button

Would you like me to proceed with the implementation?
