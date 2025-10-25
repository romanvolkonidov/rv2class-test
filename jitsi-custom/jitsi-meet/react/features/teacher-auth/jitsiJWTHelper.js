/**
 * Jitsi JWT Integration Helper
 * 
 * Use this in your frontend to get JWT tokens for teachers
 * and initialize Jitsi with proper authentication.
 */

const JWT_API_URL = process.env.JWT_API_URL || 'http://localhost:3002';
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';

/**
 * Get JWT token for teacher from backend
 * 
 * @param {string} firebaseIdToken - Firebase ID token from authenticated user
 * @param {string} roomName - Jitsi room name (e.g., 'teacher-romanvol')
 * @returns {Promise<string>} JWT token with moderator privileges
 */
export async function getTeacherJWT(firebaseIdToken, roomName) {
  try {
    const response = await fetch(`${JWT_API_URL}/api/jwt/teacher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseIdToken}`
      },
      body: JSON.stringify({ roomName })
    });

    if (!response.ok) {
      throw new Error(`JWT API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.jwt) {
      throw new Error('Failed to get JWT from API');
    }

    console.log('✅ Got teacher JWT, expires in:', data.expiresIn, 'seconds');
    return data.jwt;
  } catch (error) {
    console.error('❌ Failed to get teacher JWT:', error);
    throw error;
  }
}

/**
 * Initialize Jitsi for a teacher with JWT authentication
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.firebaseUser - Firebase user object
 * @param {string} config.roomName - Room name
 * @param {HTMLElement} config.container - DOM element to render Jitsi
 * @param {Object} config.options - Additional Jitsi options
 * @returns {Promise<JitsiMeetExternalAPI>} Jitsi API instance
 */
export async function initializeTeacherJitsi(config) {
  const { firebaseUser, roomName, container, options = {} } = config;

  if (!firebaseUser) {
    throw new Error('Firebase user is required');
  }

  if (!roomName) {
    throw new Error('Room name is required');
  }

  if (!container) {
    throw new Error('Container element is required');
  }

  // Get Firebase ID token
  const idToken = await firebaseUser.getIdToken();

  // Get JWT for teacher
  const jwt = await getTeacherJWT(idToken, roomName);

  // Initialize Jitsi with JWT
  const jitsiOptions = {
    roomName: roomName,
    jwt: jwt, // JWT with moderator: true
    parentNode: container,
    userInfo: {
      displayName: firebaseUser.displayName || 'Teacher',
      email: firebaseUser.email,
    },
    configOverwrite: {
      startWithAudioMuted: true,
      startWithVideoMuted: false,
      prejoinPageEnabled: true,
      enableLobbyChat: true,
      ...options.configOverwrite,
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      ...options.interfaceConfigOverwrite,
    },
    ...options,
  };

  console.log('🎓 Initializing Jitsi for teacher:', firebaseUser.email);
  console.log('📍 Room:', roomName);
  console.log('🔐 JWT authenticated');

  // Create Jitsi API instance
  const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, jitsiOptions);

  // Add lobby notification handler
  api.addEventListener('participantKnockingToJoin', (participant) => {
    console.log('🚪 Student knocking:', participant.name);
    
    // You can add custom notification UI here
    if (window.onStudentKnocking) {
      window.onStudentKnocking(participant, api);
    }
  });

  // Log when conference is joined
  api.addEventListener('videoConferenceJoined', () => {
    console.log('✅ Teacher joined conference');
  });

  return api;
}

/**
 * Initialize Jitsi for a student (no JWT required)
 * Student will be placed in lobby by bot
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.studentName - Student display name
 * @param {string} config.roomName - Teacher's room name
 * @param {HTMLElement} config.container - DOM element to render Jitsi
 * @param {Object} config.options - Additional Jitsi options
 * @returns {JitsiMeetExternalAPI} Jitsi API instance
 */
export function initializeStudentJitsi(config) {
  const { studentName, roomName, container, options = {} } = config;

  if (!studentName) {
    throw new Error('Student name is required');
  }

  if (!roomName) {
    throw new Error('Room name is required');
  }

  if (!container) {
    throw new Error('Container element is required');
  }

  const jitsiOptions = {
    roomName: roomName,
    // No JWT = student = will be placed in lobby
    parentNode: container,
    userInfo: {
      displayName: studentName,
    },
    configOverwrite: {
      startWithAudioMuted: true,
      startWithVideoMuted: true,
      prejoinPageEnabled: true,
      ...options.configOverwrite,
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      ...options.interfaceConfigOverwrite,
    },
    ...options,
  };

  console.log('🎒 Initializing Jitsi for student:', studentName);
  console.log('📍 Joining room:', roomName);
  console.log('⏳ Will be placed in lobby');

  const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, jitsiOptions);

  // Log when placed in lobby
  api.addEventListener('knockingParticipant', () => {
    console.log('🚪 Placed in lobby, waiting for teacher...');
  });

  // Log when admitted
  api.addEventListener('videoConferenceJoined', () => {
    console.log('✅ Admitted to conference!');
  });

  return api;
}

/**
 * Admit a student from lobby
 * 
 * @param {JitsiMeetExternalAPI} api - Jitsi API instance
 * @param {string} participantId - ID of participant to admit
 */
export function admitStudent(api, participantId) {
  api.executeCommand('answerKnockingParticipant', participantId, true);
  console.log('✅ Admitted student:', participantId);
}

/**
 * Reject a student from lobby
 * 
 * @param {JitsiMeetExternalAPI} api - Jitsi API instance
 * @param {string} participantId - ID of participant to reject
 */
export function rejectStudent(api, participantId) {
  api.executeCommand('answerKnockingParticipant', participantId, false);
  console.log('❌ Rejected student:', participantId);
}

// Export configuration for use in app
export const config = {
  JWT_API_URL,
  JITSI_DOMAIN,
};
