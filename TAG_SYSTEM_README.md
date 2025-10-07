# Student Tag System - README

## Overview
Apple-style color tag system for grouping students with shared access links.

## How It Works

### 1. Tag Colors Available
- 🔴 Red
- 🟠 Orange
- 🟡 Yellow
- 🟢 Green
- 🔵 Blue
- 🟣 Purple
- 🩷 Pink
- ⚫ Gray

### 2. Setup Tags in Firebase
Add a `tag` field to student documents:

```javascript
{
  id: "student123",
  name: "Ivan",
  teacher: "Roman",
  subjects: { English: true },
  tag: "blue"  // Add this field
}
```

### 3. Group Access Links
When multiple students share the same tag, they get a single shared link:

**Format:** `https://online.rv2class.com/student/tag/[color]`

**Examples:**
- Blue group: `https://online.rv2class.com/student/tag/blue`
- Red group: `https://online.rv2class.com/student/tag/red`

### 4. User Flow
1. Student clicks tag link (e.g., `/student/tag/blue`)
2. Sees page with buttons for all students in that color group
3. Clicks their name button
4. Redirects to their personal welcome page `/student/[id]`

### 5. Managing Tags

#### In Students Page (`/students`)
- Each student shows their tag as a colored badge
- "Group Links" section at top shows all active tags
- Copy/Open buttons for each tag group link
- Shows student count per tag

#### Setting Tags
Currently tags must be set directly in Firebase. Future enhancement: Add tag selector UI in student management.

## Use Cases

### Classroom Groups
Tag students by class/schedule:
- 🔵 Blue = Monday 4PM class
- 🟢 Green = Wednesday 5PM class
- 🔴 Red = Friday 3PM class

### Skill Levels
- 🟢 Green = Beginners
- 🟡 Yellow = Intermediate
- 🔵 Blue = Advanced

### Age Groups
- 🩷 Pink = 5-7 years old
- 🟡 Yellow = 8-10 years old
- 🔵 Blue = 11-13 years old

## Benefits
✅ One link for multiple students
✅ Easy to remember color coding
✅ Students choose their own name
✅ Visual organization in admin panel
✅ No need to send individual links
