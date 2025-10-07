# How to Use the Color Tag System

## Step 1: Assign Tags to Students

1. Go to `/students` page
2. Find any student in the list
3. Look for the "Color Tag:" section under their name
4. Click on any color circle to assign that tag
5. Click the same color again (or the × button) to remove the tag

## Step 2: Share Group Links

Once students have tags assigned:

1. The "Group Links (Tag-based)" section appears at the top of `/students` page
2. Each color group shows:
   - Color name
   - Number of students
   - Copy button (copies link to clipboard)
   - Open button (opens in new tab)

## Step 3: Students Use the Link

When students visit a tag link (e.g., `/student/tag/blue`):

1. They see a page titled "Выберите ученика" (Choose Student)
2. All students with that tag appear as colored buttons
3. Each button shows:
   - Student name
   - Teacher name
   - Color dot
4. Student clicks their name → redirected to their personal welcome page

## Example Workflow

### Scenario: Monday 4PM English Class

1. **Assign blue tag to all students in this class:**
   - Click blue circle next to Ivan ✓
   - Click blue circle next to Maria ✓
   - Click blue circle next to Alex ✓

2. **Share the blue group link:**
   - Copy link: `https://online.rv2class.com/student/tag/blue`
   - Send to all 3 students (WhatsApp, Telegram, etc.)

3. **Students join:**
   - All 3 students use the same link
   - Each clicks their own name
   - Gets redirected to their personal page
   - Can join the lesson

## Color Circles Guide

🔴 Red - `red`
🟠 Orange - `orange`  
🟡 Yellow - `yellow`
🟢 Green - `green`
🔵 Blue - `blue`
🟣 Purple - `purple`
🩷 Pink - `pink`
⚫ Gray - `gray`

## Features

✅ **Click to assign** - Single click assigns tag
✅ **Click again to remove** - Or use × button
✅ **Instant update** - Changes save immediately to Firebase
✅ **Visual feedback** - Selected tags show with ring
✅ **Loading state** - Buttons disabled while updating
✅ **Auto-refresh** - Student list updates after tag change

## Pro Tips

- Use different colors for different class times
- Use colors to group by level (beginner, intermediate, advanced)
- Use colors for age groups
- One student can only have ONE tag at a time
- Students without tags won't appear in any group link
