import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * JWT Generator Service for Teacher Authentication
 * 
 * Generates JWT tokens with moderator privileges for teachers.
 * These tokens allow teachers to bypass lobby and auto-admit.
 */
class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.appId = process.env.JWT_APP_ID || process.env.JWT_ISSUER;
    this.domain = process.env.JITSI_DOMAIN || 'meet.jit.si';
    
    if (!this.secret) {
      console.warn('⚠️  WARNING: JWT_SECRET not configured!');
    }
  }

  /**
   * Generate JWT for a teacher
   * 
   * @param {Object} teacher - Teacher information
   * @param {string} teacher.id - Teacher Firebase UID
   * @param {string} teacher.email - Teacher email
   * @param {string} teacher.name - Teacher display name
   * @param {string} roomName - Room name (e.g., 'teacher-romanvol')
   * @param {number} expiresIn - Token expiration in seconds (default: 2 hours)
   * @returns {string} JWT token
   */
  generateTeacherToken(teacher, roomName, expiresIn = 7200) {
    if (!this.secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const now = Math.floor(Date.now() / 1000);

    const payload = {
      context: {
        user: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          moderator: true, // KEY: This makes them a moderator
          affiliation: 'owner', // Also mark as owner
        },
      },
      room: roomName,
      sub: this.domain,
      iss: this.appId,
      aud: 'jitsi',
      iat: now,
      exp: now + expiresIn,
      nbf: now - 10, // Not before: 10 seconds ago (clock skew)
    };

    const token = jwt.sign(payload, this.secret);
    
    console.log(`🔐 Generated teacher JWT for ${teacher.name} (${teacher.email})`);
    console.log(`   Room: ${roomName}`);
    console.log(`   Expires: ${new Date((now + expiresIn) * 1000).toISOString()}`);
    
    return token;
  }

  /**
   * Generate JWT for a student (no moderator privileges)
   * 
   * @param {Object} student - Student information
   * @param {string} student.id - Student ID
   * @param {string} student.name - Student display name
   * @param {string} roomName - Room name
   * @param {number} expiresIn - Token expiration in seconds (default: 4 hours)
   * @returns {string} JWT token (optional - students can join without JWT)
   */
  generateStudentToken(student, roomName, expiresIn = 14400) {
    if (!this.secret) {
      // Students can join without JWT in most configurations
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    const payload = {
      context: {
        user: {
          id: student.id,
          name: student.name,
          moderator: false, // Not a moderator
          affiliation: 'member',
        },
      },
      room: roomName,
      sub: this.domain,
      iss: this.appId,
      aud: 'jitsi',
      iat: now,
      exp: now + expiresIn,
      nbf: now - 10,
    };

    return jwt.sign(payload, this.secret);
  }

  /**
   * Verify a JWT token
   * 
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    if (!this.secret) {
      throw new Error('JWT_SECRET not configured');
    }

    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      console.error('❌ JWT verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if a token belongs to a moderator
   * 
   * @param {string} token - JWT token
   * @returns {boolean} True if token has moderator privileges
   */
  isModerator(token) {
    try {
      const decoded = this.verifyToken(token);
      return decoded.context?.user?.moderator === true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
const jwtService = new JWTService();

export default jwtService;
