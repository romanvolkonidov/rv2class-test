# Rating Exclusion System

## Overview
Students can be excluded from the public rating/leaderboard system while still accessing all other platform features.

## How It Works

### 1. Database Structure
- **Collection**: `studentProfiles`
- **Field**: `excludeFromRating` (boolean, default: `false`)
- When `true`, the student is excluded from all public ratings

### 2. UI Components

#### SimplifiedStudentProfile Component
Located in: `components/SimplifiedStudentProfile.tsx`

**Features:**
- Toggle button to include/exclude student from rating
- Only visible when `showRatingToggle={true}` prop is passed
- Visual indication of current status
- Instant update to Firestore

**Usage:**
```tsx
<SimplifiedStudentProfile
  studentId="student-id"
  showRatingToggle={true}  // Show the toggle control
/>
```

#### Student Welcome Page
Located in: `app/student/[id]/student-welcome.tsx`

**Behavior:**
- Checks `excludeFromRating` status on page load
- If excluded:
  - Shows message: "Вы не участвуете в общем рейтинге"
  - Does NOT fetch rating data
  - Gray/neutral styling
- If included:
  - Shows full rating card with score
  - Shows rank position (e.g., "Место: 5 из 45")
  - Amber/gold styling
  - "Подробнее" button for details

### 3. Backend Logic

#### fetchStudentRatings Function
Located in: `lib/firebase.ts`

**Process:**
1. Fetches all student ratings from Cloud Function
2. Queries Firestore `studentProfiles` for each student
3. Filters out students where `excludeFromRating === true`
4. Recalculates ranks after filtering
5. Returns only the filtered/reranked list

**Key Features:**
- Excluded students are completely removed from the list
- Ranks are recalculated so there are no gaps
- Total student count reflects only included students
- Excluded students cannot see their rank (returns `null`)

### 4. Privacy & Transparency

#### For Excluded Students:
- ✅ Can still access all platform features
- ✅ Can view homework, join classes, etc.
- ✅ Clear message explaining they're not in rating
- ❌ Cannot see their rank or rating score
- ❌ Do not appear in any leaderboards

#### For Included Students:
- ✅ See accurate rankings without excluded students
- ✅ Total count shows only participating students
- ✅ No gaps in ranking positions

## Technical Implementation

### Cloud Function Integration
The Cloud Function at `https://getstudentratings-35666ugduq-uc.a.run.app` returns ALL students with their performance data. The frontend filters excluded students client-side by:

1. Fetching the full ratings array
2. Checking each student's profile for `excludeFromRating`
3. Filtering and reranking
4. Displaying results

### Performance Considerations
- Profile checks are done in parallel using `Promise.all`
- Results are cached in component state
- Only refetches when student ID changes

## Testing

### To Test Exclusion:
1. Go to a student's profile with `showRatingToggle={true}`
2. Click "Исключить" button
3. Refresh student's welcome page
4. Should see gray message instead of rating card
5. Check other students' rankings - excluded student should not appear

### To Test Inclusion:
1. Click "Включить" button
2. Refresh student's welcome page
3. Should see amber rating card with score and rank
4. Verify rank position is accurate

## Future Enhancements
- [ ] Move filtering to Cloud Function for better performance
- [ ] Add admin dashboard to manage exclusions
- [ ] Track exclusion history/audit log
- [ ] Batch exclusion/inclusion operations
- [ ] Notification to student when status changes
