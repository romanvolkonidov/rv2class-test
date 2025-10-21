# Student Rating System Implementation - Jitsi Homework

## Summary

Implemented student rating system on the Jitsi homework page, similar to rv2class. The rating shows overall performance across all completed homework assignments.

## Changes Made

### 1. StudentHomeworkPage.tsx

Added rating calculation logic:
- **New state**: `rating` - stores calculated rating percentage (0-100)
- **New function**: `calculateRating()` - calculates overall rating based on all homework

#### Rating Calculation Formula:
```
rating = (sum of correct answers) / (sum of total questions) * 100
```

#### Example:
- HW1: 80% on 10 questions = 8 correct
- HW2: 50% on 10 questions = 5 correct
- Overall: (8+5)/(10+10) = 13/20 = 65%

#### How it works:
1. Iterates through all assignments
2. Finds corresponding report for each assignment
3. If report exists:
   - Calculates correct answers: `(score/100) * totalQuestions`
   - Adds to running totals
4. If no report (not started yet):
   - Homework is not counted yet
   - Once student starts (even gets 0%), it will be counted
5. Returns: `(totalCorrect / totalQuestions) * 100`

#### Key Notes:
- **score field**: Already a percentage (0-100), NOT raw correct count
- **Conversion**: `correctAnswers = Math.round((score/100) * totalQuestions)`
- **Incomplete homework**: Only counted if there's a report (student started)
- **No totalQuestions in assignments**: We rely on report.totalQuestions

### 2. StudentHomeworkList.tsx

Added rating display:
- **New prop**: `rating?: number | null` - overall rating percentage
- **New UI element**: Rating badge with trophy icon

#### Rating Badge Design:
- Displays between header and stats
- Yellow/amber gradient background (matches trophy theme)
- Trophy icon + percentage + "Overall Rating" label
- Glass morphism effect with backdrop blur
- Only shows if rating is not null

### 3. homework.css

Added styling for rating badge:
- `.homework-rating-badge` - Container with gradient background
- `.rating-content` - Flexbox layout for value and label
- `.rating-value` - Large bold percentage with gradient text
- `.rating-label` - Small uppercase label

#### Design Features:
- Linear gradient: amber/yellow (#eab308, #fbbf24)
- Backdrop blur: 10px for glass effect
- Border: 2px solid with transparency
- Box shadow: Yellow glow effect
- Responsive sizing

## User Experience

### Student View:
1. **On homework page**: See rating badge at top
2. **Rating shows**: Overall performance percentage
3. **Example**: "75%" with trophy icon and "Overall Rating" label
4. **Updates**: Recalculates when new homework is completed

### Visual Hierarchy:
```
[Back Button] [Theme Toggle]
[Book Icon] Student's Homework
            Complete assignments...
[Trophy Icon] 75% Overall Rating  ← NEW RATING BADGE
[Total: 5] [Completed: 3] [Pending: 2]
[Assignment Cards...]
```

## Technical Details

### Data Flow:
1. `StudentHomeworkPage` loads assignments and reports
2. Calls `calculateRating(assignments, reports)`
3. Stores result in `rating` state
4. Passes rating to `StudentHomeworkList` component
5. Component displays rating badge if rating exists

### Data Dependencies:
- **telegramAssignments**: studentId, assignedAt
- **telegramHomeworkReports**: homeworkId, studentId, score, totalQuestions

### Score Conversion Logic:
```typescript
// Input: report.score = 80 (percentage), report.totalQuestions = 10
const correctAnswers = Math.round((80 / 100) * 10); // = 8

// For all homework:
totalCorrect = 8 + 5 + 10 = 23
totalQuestions = 10 + 10 + 15 = 35
rating = (23 / 35) * 100 = 65.7% ≈ 66%
```

## Files Modified

1. **`StudentHomeworkPage.tsx`**
   - Added `rating` state
   - Added `calculateRating()` function
   - Updated to pass rating to StudentHomeworkList

2. **`StudentHomeworkList.tsx`**
   - Added `rating` prop to IProps interface
   - Added rating parameter to function
   - Added rating badge UI element in header

3. **`homework.css`**
   - Added `.homework-rating-badge` styles
   - Added `.rating-content` styles
   - Added `.rating-value` gradient text styles
   - Added `.rating-label` styles

## Differences from rv2class

### rv2class:
- Uses Cloud Function to calculate ratings
- Includes incomplete homework (from assignment data)
- Shows rank and leaderboard comparison
- Rating on 0-10 scale, displayed as percentage

### Jitsi (our implementation):
- Client-side calculation (no Cloud Function)
- Only counts homework with reports (started homework)
- No ranking/leaderboard yet
- Direct percentage display (0-100)

## Future Enhancements

### Potential Additions:
1. **Include unstarted homework**: Store totalQuestions in assignment document
2. **Leaderboard**: Show all students' ratings for comparison
3. **Rank display**: "5th out of 20 students"
4. **Trend indicators**: Show if rating is improving (↑) or declining (↓)
5. **Detailed breakdown**: Modal showing per-homework scores
6. **Achievement badges**: Milestones (50%, 75%, 90%+ ratings)

## Testing

### Test Cases:
1. **No homework**: Rating should be null, badge hidden
2. **One homework, 100%**: Rating should be 100%
3. **Two homework, different scores**: Should calculate average correctly
4. **Incomplete homework**: Should not affect rating until started
5. **Zero score**: Should count as 0 correct, not ignored

### Example Calculations:
```
Case 1: HW1: 10/10 (100%)
  Rating: 10/10 = 100%

Case 2: HW1: 5/10 (50%), HW2: 10/10 (100%)
  Rating: (5+10)/(10+10) = 15/20 = 75%

Case 3: HW1: 8/10 (80%), HW2: 0/10 (0%)
  Rating: (8+0)/(10+10) = 8/20 = 40%

Case 4: HW1: 8/10 (80%), HW2: not started
  Rating: 8/10 = 80% (HW2 not counted yet)
```

## Benefits

1. **Motivation**: Students see overall progress
2. **Transparency**: Clear performance indicator
3. **Goal setting**: Students can aim for higher ratings
4. **Self-awareness**: Understand strengths and weaknesses
5. **Accountability**: Visual reminder of performance

## Notes

- Rating recalculates on every page load (no caching)
- Console logs show calculation details for debugging
- Rounding to nearest integer percentage
- If all homework incomplete, rating is null (no badge shown)
