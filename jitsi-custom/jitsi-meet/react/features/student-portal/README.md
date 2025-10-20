# Student Portal Feature

## Overview

This feature provides a Jitsi-native React component for the student welcome page, replacing the standalone HTML implementation.

## Components

### `StudentWelcome.tsx`

The main presentational component with Jitsi's native design system.

**Features:**
- ✅ Jitsi native styling using `makeStyles` and theme tokens
- ✅ Responsive design matching Jitsi's UI
- ✅ "Join Lesson" button to enter teacher's room
- ✅ "Homework" button with count badge
- ✅ Teacher information display
- ✅ Pre-join checklist

**Props:**
```typescript
interface IProps {
    student: {
        id: string;
        name: string;
        teacher?: string;
        teacherName?: string;
        teacherUid?: string;
    };
    onJoinLesson: () => void;
    onViewHomework: () => void;
    uncompletedCount?: number;
}
```

### `StudentWelcomePage.tsx`

Container component that handles:
- URL parameter parsing (`?student=<id>`)
- Firebase data loading
- Homework count calculation
- Navigation logic

## Design System

This component uses Jitsi's native design tokens:

### Colors
- `theme.palette.uiBackground` - Page background
- `theme.palette.ui01` - Card background
- `theme.palette.ui02` - Secondary surfaces
- `theme.palette.action01` - Primary action color (blue)
- `theme.palette.action02` - Secondary action color
- `theme.palette.actionDanger` - Danger/alert color (red badge)
- `theme.palette.text01` - Primary text
- `theme.palette.text02` - Secondary text

### Typography
- `theme.typography.heading3` - Large headings
- `theme.typography.heading4` - Medium headings
- `theme.typography.bodyShortBold` - Bold body text
- `theme.typography.bodyShortRegular` - Regular body text

### Spacing
- `theme.spacing(n)` - Consistent spacing (multiples of 8px)

### Shape
- `theme.shape.borderRadius` - Standard border radius

## Integration

### Option 1: Use as React Component

```tsx
import StudentWelcome from '@jitsi/react/features/student-portal';

function App() {
    const student = {
        id: '123',
        name: 'Alex Johnson',
        teacher: 'Roman'
    };

    return (
        <StudentWelcome
            student={student}
            onJoinLesson={() => window.location.href = '/teacher-room'}
            onViewHomework={() => window.location.href = '/homework'}
            uncompletedCount={3}
        />
    );
}
```

### Option 2: Use Page Component (with Firebase)

```tsx
import StudentWelcomePage from '@jitsi/react/features/student-portal/components/web/StudentWelcomePage';

// Access via: /student-welcome?student=<studentId>
```

## Firebase Integration

To enable Firebase integration in `StudentWelcomePage.tsx`:

1. Uncomment the Firebase imports
2. Uncomment the Firebase data loading code
3. Remove or comment out the mock data section

```typescript
// Uncomment these:
import { db } from '../../../app/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
```

## URL Structure

Student accesses the page via:
```
https://your-jitsi-domain.com/student-welcome?student=<firebaseStudentId>
```

The component will:
1. Load student data from Firebase ('students' or 'teacherStudents' collection)
2. Count uncompleted homework assignments
3. Display welcome screen with personalized information
4. On "Join": Redirect to `/<teacherRoom>` (Jitsi native lobby handles entry)
5. On "Homework": Redirect to `/student-homework.html?studentId=<id>`

## Styling Notes

The component automatically adapts to Jitsi's theme, including:
- Dark/light mode support
- Mobile responsiveness
- Touch-friendly button sizes
- Proper color contrast
- Smooth transitions and hover states

## Next Steps

1. **Route Setup**: Add route in Jitsi's routing configuration
2. **Firebase Config**: Set up Firebase configuration in Jitsi app
3. **Icons**: Verify icon imports match your Jitsi icon library
4. **Testing**: Test with real student data from Firebase
5. **Accessibility**: Add ARIA labels and keyboard navigation
6. **i18n**: Add translation support for multi-language

## Migration from HTML

To replace the existing `student-welcome.html`:

1. Set up routing to serve this React component at `/student-welcome`
2. Update student links to point to new React route
3. Verify Firebase integration works correctly
4. Test with real student accounts
5. Remove old HTML file once verified

## Customization

To customize colors/styling, modify the `useStyles` hook in `StudentWelcome.tsx`. All styling uses Jitsi's theme tokens for consistency.

Example:
```typescript
const useStyles = makeStyles()(theme => {
    return {
        studentName: {
            ...theme.typography.heading3,
            color: theme.palette.action01, // Change this to customize
            marginBottom: theme.spacing(2)
        }
    };
});
```
