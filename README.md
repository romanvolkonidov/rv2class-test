# RV2Class - Video Tutoring Platform

A professional English tutoring platform with real-time video, screen sharing with audio, collaborative whiteboard, and annotation tools.

## Features

- 🎥 **HD Video Calls** - Crystal clear video and audio using LiveKit
- 🖥️ **Screen Sharing** - Share your screen with audio, choose specific windows/tabs
- 🎨 **Collaborative Whiteboard** - Real-time drawing and annotation tools
- ✏️ **Annotation Tools** - Draw on shared screens with pencil, shapes, and colors
- 👨‍🏫 **Tutor Mode** - Create sessions and manage students
- 👨‍🎓 **Student Mode** - Easy join with 6-digit codes
- 🎨 **Beautiful UI** - Apple-inspired design with smooth animations

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **LiveKit** - Real-time video infrastructure
- **Firebase** - Authentication and database
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### As a Tutor:
1. Enter your name
2. Click "Create Session"
3. Share the 6-digit code with your student
4. Use the "Share Screen" button to share your screen
5. Toggle to "Show Whiteboard" for collaborative drawing

### As a Student:
1. Enter your name
2. Enter the 6-digit session code from your tutor
3. Click "Join Session"

## Environment Variables

The following environment variables are configured in `.env`:

- `LIVEKIT_URL` - Your LiveKit server URL
- `LIVEKIT_API_KEY` - Your LiveKit API key
- `LIVEKIT_API_SECRET` - Your LiveKit API secret
- `NEXT_PUBLIC_LIVEKIT_URL` - Public LiveKit URL for client

## Features in Detail

### Screen Sharing
- Share entire screen or specific windows/tabs
- Includes system audio
- Students can view in real-time

### Whiteboard
- Real-time collaborative drawing
- Tools: Pencil, Eraser, Rectangle, Circle
- Color picker with presets
- Adjustable line width
- Undo/Redo functionality
- Clear canvas
- Download whiteboard as image

### Video Conference
- HD video quality
- Echo cancellation
- Noise suppression
- Automatic layout adjustment

## Deployment

Build for production:

```bash
npm run build
npm start
```

Deploy to Vercel, Netlify, or your preferred hosting platform.

## License

ISC
