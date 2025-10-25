import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import jwtService from './JWTService.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://online.rv2class.com',
    'https://app.rv2class.com',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials: true
}));
app.use(express.json());

/**
 * Verify Firebase ID token from request
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
}

/**
 * POST /api/jwt/teacher
 * Generate JWT for teacher
 * 
 * Request body:
 * {
 *   "roomName": "teacher-romanvol"
 * }
 * 
 * Headers:
 * Authorization: Bearer <firebase-id-token>
 */
app.post('/api/jwt/teacher', verifyFirebaseToken, async (req, res) => {
  try {
    const { roomName } = req.body;
    const user = req.user;
    
    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }
    
    // Verify user is a teacher (you can add additional checks here)
    // For now, any authenticated user can get a teacher token
    
    const teacher = {
      id: user.uid,
      email: user.email,
      name: user.name || user.email?.split('@')[0] || 'Teacher'
    };
    
    const token = jwtService.generateTeacherToken(teacher, roomName);
    
    res.json({
      success: true,
      jwt: token,
      expiresIn: 7200, // 2 hours
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      }
    });
  } catch (error) {
    console.error('Error generating teacher JWT:', error);
    res.status(500).json({ error: 'Failed to generate JWT' });
  }
});

/**
 * POST /api/jwt/student
 * Generate JWT for student (optional)
 * 
 * Request body:
 * {
 *   "studentId": "student-123",
 *   "studentName": "John Smith",
 *   "roomName": "teacher-romanvol"
 * }
 */
app.post('/api/jwt/student', async (req, res) => {
  try {
    const { studentId, studentName, roomName } = req.body;
    
    if (!studentId || !studentName || !roomName) {
      return res.status(400).json({ 
        error: 'studentId, studentName, and roomName are required' 
      });
    }
    
    const student = {
      id: studentId,
      name: studentName
    };
    
    const token = jwtService.generateStudentToken(student, roomName);
    
    res.json({
      success: true,
      jwt: token, // Can be null if JWT not required for students
      expiresIn: 14400, // 4 hours
      student: {
        id: student.id,
        name: student.name
      }
    });
  } catch (error) {
    console.error('Error generating student JWT:', error);
    res.status(500).json({ error: 'Failed to generate JWT' });
  }
});

/**
 * POST /api/jwt/verify
 * Verify a JWT token
 */
app.post('/api/jwt/verify', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    
    const decoded = jwtService.verifyToken(token);
    const isModerator = jwtService.isModerator(token);
    
    res.json({
      success: true,
      valid: true,
      decoded,
      isModerator
    });
  } catch (error) {
    res.json({
      success: false,
      valid: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'JWT API',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.JWT_API_PORT || 3002;

app.listen(PORT, () => {
  console.log(`🔐 JWT API server running on port ${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   - POST /api/jwt/teacher (authenticated)`);
  console.log(`   - POST /api/jwt/student`);
  console.log(`   - POST /api/jwt/verify`);
  console.log(`   - GET  /api/health`);
});

export default app;
