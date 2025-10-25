import admin from 'firebase-admin';
import express from 'express';
import dotenv from 'dotenv';
import RoomBot from './RoomBot.js';

dotenv.config();

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const db = admin.firestore();

// Store active bots
const activeBots = new Map();

/**
 * Get all teacher rooms from Firebase
 * Returns rooms for ALL teachers (bots run 24/7 to maintain lobby)
 */
async function getAllTeacherRooms() {
  try {
    const rooms = [];
    
    // Get all teachers (service_provider role) from users collection
    const teachersSnapshot = await db.collection('users')
      .where('role', '==', 'service_provider')
      .get();
    
    teachersSnapshot.forEach(doc => {
      // Room name format: teacher-{userId}
      const roomName = `teacher-${doc.id}`;
      rooms.push(roomName);
    });

    console.log(`📚 Found ${rooms.length} teacher rooms (all teachers 24/7):`, rooms);
    return rooms;
  } catch (error) {
    console.error('❌ Error fetching teacher rooms:', error);
    return [];
  }
}

/**
 * Start bot for a specific room
 */
async function startBotForRoom(roomName) {
  if (activeBots.has(roomName)) {
    console.log(`ℹ️  Bot already running for ${roomName}`);
    return activeBots.get(roomName);
  }

  console.log(`🤖 Starting bot for room: ${roomName}`);
  const bot = new RoomBot(roomName);
  
  try {
    await bot.start();
    activeBots.set(roomName, bot);
    console.log(`✅ Bot started successfully for ${roomName}`);
    return bot;
  } catch (error) {
    console.error(`❌ Failed to start bot for ${roomName}:`, error);
    throw error;
  }
}

/**
 * Stop bot for a specific room
 */
function stopBotForRoom(roomName) {
  const bot = activeBots.get(roomName);
  if (bot) {
    bot.stop();
    activeBots.delete(roomName);
    console.log(`🛑 Bot stopped for ${roomName}`);
  }
}

/**
 * Initialize all bots for existing teachers
 */
async function initializeAllBots() {
  console.log('🚀 Initializing bot service...');
  
  // Get all teacher rooms
  const rooms = await getAllTeacherRooms();
  
  // Start bot for each room
  for (const room of rooms) {
    try {
      await startBotForRoom(room);
      // Small delay between bot starts to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to start bot for ${room}, continuing...`);
    }
  }
  
  console.log(`✅ Bot service initialized with ${activeBots.size} active bots`);
}

/**
 * Listen for new teacher registrations
 */
function listenForNewTeachers() {
  db.collection('teacherStudents')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.teacherUid) {
            const roomName = `teacher-${data.teacherUid.substring(0, 8)}`;
            
            // Start bot if not already running
            if (!activeBots.has(roomName)) {
              console.log(`🆕 New teacher detected: ${roomName}`);
              startBotForRoom(roomName).catch(err => {
                console.error(`Failed to start bot for new teacher ${roomName}:`, err);
              });
            }
          }
        }
      });
    });
  
  console.log('👂 Listening for new teacher registrations...');
}

// Create API server for health checks and management
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeBots: activeBots.size,
    rooms: Array.from(activeBots.keys()),
  });
});

// Manually start bot for a room
app.post('/bot/start/:roomName', async (req, res) => {
  const { roomName } = req.params;
  try {
    await startBotForRoom(roomName);
    res.json({ success: true, message: `Bot started for ${roomName}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually stop bot for a room
app.post('/bot/stop/:roomName', (req, res) => {
  const { roomName } = req.params;
  stopBotForRoom(roomName);
  res.json({ success: true, message: `Bot stopped for ${roomName}` });
});

// List all active bots
app.get('/bots', (req, res) => {
  const bots = Array.from(activeBots.entries()).map(([room, bot]) => ({
    room,
    status: bot.isConnected() ? 'connected' : 'disconnected',
    participants: bot.getParticipantCount(),
  }));
  
  res.json({ bots });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌐 API server running on port ${PORT}`);
});

// Initialize bots
initializeAllBots()
  .then(() => {
    listenForNewTeachers();
  })
  .catch(err => {
    console.error('❌ Failed to initialize bot service:', err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  activeBots.forEach((bot, roomName) => {
    console.log(`Stopping bot for ${roomName}`);
    bot.stop();
  });
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  activeBots.forEach((bot, roomName) => {
    console.log(`Stopping bot for ${roomName}`);
    bot.stop();
  });
  process.exit(0);
});
