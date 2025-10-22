# Permanent Teacher Rooms Implementation

## Overview
Each teacher now has a **permanent room** that never changes. Students are automatically routed to their teacher's room based on the `teacherUid` stored in their Firestore document.

## How It Works

### 1. Teacher Side

#### Teacher Authentication & Room Creation
- When a teacher clicks "Start Meeting" in `TeacherAuthPage.tsx`:
  - Room name is generated: `teacher-${teacherUid.substring(0, 8)}`
  - Example: If teacher UID is `romanvolkonidov`, room = `teacher-romanvol`
  - This room **never changes** for that teacher
  - Teacher info is stored in localStorage for the room

#### Adding Students
- When a teacher adds a student via the Students page (`TeacherStudentsPage.tsx`):
  - Student document is created with:
    - `name`: Student's name
    - `teacherEmail`: Teacher's email
    - `teacherUid`: Teacher's Firebase UID (critical for routing)
    - `teacherName`: Extracted from email
    - `subjects`: Selected subjects
    - `tag`: Color tag (optional)

### 2. Student Side

#### Student Welcome Page
- Student opens their unique link: `/static/student-welcome.html?studentId={id}`
- `StudentWelcomePage.tsx` loads student data from Firestore
- Student sees:
  - Welcome message with their name
  - Their teacher's name
  - Their subjects
  - Uncompleted homework count
  - "Join Lesson" button

#### Joining Lesson (Prejoin Flow)
When student clicks "Join Lesson" (`StudentWelcomePage.tsx`):

1. **Extract Teacher UID**:
   ```typescript
   const teacherUid = student.teacherUid || 'romanvolkonidov';
   const teacherRoom = `teacher-${teacherUid.substring(0, 8)}`;
   ```

2. **Store Info in localStorage**:
   - `teacherFirstName`: For display in room
   - `teacherRoomId`: The permanent room name
   - `studentName`: Student's display name
   - `studentId`: For homework tracking

3. **Redirect to Prejoin Page**:
   ```typescript
   const roomUrl = `/${teacherRoom}#config.prejoinPageEnabled=true&userInfo.displayName=${encodeURIComponent(student.name)}`;
   window.location.href = roomUrl;
   ```

4. **Student Sees Prejoin Page**:
   - Camera and microphone preview
   - Can test devices before joining
   - Shows student's name as display name
   - "Join meeting" button to enter the room

5. **Student Joins Teacher's Room**:
   - Student enters the permanent teacher room
   - Teacher sees student with their correct name
   - All students belonging to that teacher join the same room

## Database Schema

### Firestore Collections

#### `students` (Shared Collection)
For teachers in `SHARED_COLLECTION_TEACHERS` array:
```typescript
{
  id: string,              // Auto-generated doc ID
  name: string,            // Student's name
  teacherEmail: string,    // Teacher's email
  teacherUid: string,      // Teacher's Firebase UID (for room routing)
  teacherName: string,     // Teacher's display name
  subjects: {
    English?: boolean,
    IT?: boolean
  },
  tag?: string,            // Color tag (red, green, blue, etc.)
  createdAt: timestamp
}
```

#### `students_{teacherEmail}` (Individual Collections)
For other teachers, separate collection per teacher with same schema.

## Room Naming Convention

### Teacher Room Format
```
teacher-{first8charsOfUid}
```

**Examples**:
- UID: `romanvolkonidov` → Room: `teacher-romanvol`
- UID: `abc123def456` → Room: `teacher-abc123de`

### Why First 8 Characters?
- Short and readable
- Unique enough to avoid collisions
- Consistent across sessions

## Key Files Modified

### 1. TeacherAuthPage.tsx
```typescript
const handleStartMeeting = () => {
    const teacherUid = user?.uid || 'romanvolkonidov';
    const roomName = `teacher-${teacherUid.substring(0, 8)}`;
    localStorage.setItem('teacherFirstName', teacherFirstName);
    localStorage.setItem('teacherRoomId', roomName);
    window.location.href = `/${roomName}`;
};
```

### 2. TeacherStudentsPage.tsx
```typescript
// Store teacherUid when adding student
await addDoc(studentsRef, {
    name: newStudentName.trim(),
    teacherEmail: teacherEmail,
    teacherUid: teacherUid,  // Critical for routing
    teacherName: teacherEmail.split('@')[0],
    subjects: newStudentSubjects,
    createdAt: serverTimestamp(),
    tag: null
});
```

### 3. StudentWelcomePage.tsx
```typescript
const handleJoinLesson = () => {
    const teacherUid = student.teacherUid || 'romanvolkonidov';
    const teacherRoom = `teacher-${teacherUid.substring(0, 8)}`;
    
    // Store info for room
    localStorage.setItem('teacherFirstName', teacherFirstName);
    localStorage.setItem('teacherRoomId', teacherRoom);
    localStorage.setItem('studentName', student.name);
    localStorage.setItem('studentId', student.id);
    
    // Redirect to prejoin page
    const roomUrl = `/${teacherRoom}#config.prejoinPageEnabled=true&userInfo.displayName=${encodeURIComponent(student.name)}`;
    window.location.href = roomUrl;
};
```

## Benefits

### For Teachers
- ✅ **Same room every time** - no need to share new links
- ✅ **Easy to remember** - consistent room name
- ✅ **Students auto-routed** - no manual room sharing
- ✅ **Multiple teachers supported** - each has their own room

### For Students
- ✅ **Camera/mic preview** - test devices before joining
- ✅ **Automatic routing** - always join correct teacher
- ✅ **Name pre-filled** - no manual entry needed
- ✅ **Simple flow** - click Join → preview → enter room

## Testing

### Test Teacher Room
1. Login as teacher (Roman or Violet)
2. Click "Start Meeting"
3. Note the room name in URL (e.g., `/teacher-romanvol`)
4. Leave and rejoin - room name stays the same

### Test Student Flow
1. Go to Students page as teacher
2. Add a new student (teacherUid will be saved automatically)
3. Copy student's link
4. Open in new browser/incognito
5. Click "Join Lesson"
6. Should see prejoin page with camera/mic preview
7. Click "Join meeting"
8. Should enter teacher's permanent room

### Verify Database
1. Open Firebase Console
2. Go to Firestore
3. Check `students` collection
4. Verify each student has `teacherUid` field
5. Example: `teacherUid: "romanvolkonidov"`

## Migration for Existing Students

If you have existing students without `teacherUid`:

1. **Automatic Fallback**: Code uses `|| 'romanvolkonidov'` as default
2. **Manual Update**: Add `teacherUid` field to existing student documents
3. **Bulk Update Script** (if needed):
```javascript
// Run in Firebase Console
const students = await db.collection('students').get();
students.forEach(async (doc) => {
  if (!doc.data().teacherUid) {
    await doc.ref.update({
      teacherUid: 'romanvolkonidov' // or appropriate UID
    });
  }
});
```

## Future Enhancements

- [ ] Teacher can customize their room name
- [ ] Teacher can see all active students in room
- [ ] Student can see if teacher is currently online
- [ ] Recording management per teacher room
- [ ] Room-specific settings and branding
