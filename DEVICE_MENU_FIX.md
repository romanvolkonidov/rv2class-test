# Device Menu Visibility Fix

## Problem
The microphone and camera device selection menus (opened by clicking the chevron buttons) were being cut off by screen share and whiteboard overlays. Users couldn't see all the menu options when these overlays were active.

## Root Cause
The control bar had a z-index of `z-[61]` when annotations were active, but:
- Annotation overlay components used z-indexes up to `z-[70]` for dropdowns
- The device menus (mic/camera) were children of the control bar with `z-[9999]`
- Since z-index creates a stacking context, child elements cannot escape above other elements that have a higher z-index than their parent

## Solution
Increased the control bar's z-index to `z-[100]` when either:
- Annotations are active (`showAnnotations`)
- Whiteboard is active (`showWhiteboard`)

This ensures the control bar and all its child menus (mic/camera device selectors) always appear above:
- Screen share content
- Whiteboard (Excalidraw) content
- Annotation overlay canvas (`z-50`)
- Annotation toolbar (`z-[60]`)
- Annotation text editing popup (`z-[65]`)
- Annotation clear menu dropdowns (`z-[70]`)

## Files Modified
- `components/CustomControlBar.tsx`: Updated z-index logic from `z-[61]` to `z-[100]` when overlays are active

## Result
✅ Mic and camera device menus are now always fully visible and accessible
✅ No cut-off when screen sharing
✅ No cut-off when whiteboard is active
✅ No cut-off when annotations are active
