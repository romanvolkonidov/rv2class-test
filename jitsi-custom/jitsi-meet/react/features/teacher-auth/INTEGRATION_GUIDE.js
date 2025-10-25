/**
 * Updated TeacherAuthPage.tsx - JWT Integration Guide
 * 
 * This file shows how to modify your existing TeacherAuthPage.tsx
 * to use JWT authentication for automatic lobby bypass.
 */

// ADD THIS IMPORT at the top of TeacherAuthPage.tsx:
import { initializeTeacherJitsi } from '../jitsiJWTHelper';

// REPLACE the handleStartMeeting function with this version:

const handleStartMeeting = async () => {
    // Create permanent room based on teacher's UID
    const teacherUid = user?.uid || 'romanvolkonidov';
    const roomName = `teacher-${teacherUid.substring(0, 8)}`;
    
    // Store teacher info
    const teacherFirstName = (user?.displayName || 'Roman').split(' ')[0];
    const teacherDisplayName = user?.displayName || 'Teacher Roman';
    localStorage.setItem('teacherFirstName', teacherFirstName);
    localStorage.setItem('teacherRoomId', roomName);
    
    console.log('👨‍🏫 TEACHER JOINING WITH JWT:');
    console.log('   Name:', teacherDisplayName);
    console.log('   UID:', teacherUid);
    console.log('   Room:', roomName);
    
    try {
        // OPTION 1: Use the helper to initialize Jitsi in an iframe
        // This approach embeds Jitsi in your page
        
        const container = document.getElementById('jitsi-container');
        if (container) {
            const api = await initializeTeacherJitsi({
                firebaseUser: user,
                roomName: roomName,
                container: container,
                options: {
                    configOverwrite: {
                        prejoinPageEnabled: true,
                        startWithAudioMuted: true,
                        startWithVideoMuted: false,
                    }
                }
            });
            
            // Add lobby notification handler
            api.addEventListener('participantKnockingToJoin', (participant) => {
                // Show notification to teacher
                showLobbyNotification(participant, api);
            });
            
            return;
        }
        
        // OPTION 2: Redirect to Jitsi with JWT in URL
        // This approach redirects to Jitsi's page
        
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
        // Get JWT from your backend
        const response = await fetch('http://localhost:3002/api/jwt/teacher', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ roomName })
        });
        
        const data = await response.json();
        
        if (data.success && data.jwt) {
            console.log('✅ Got JWT, redirecting to Jitsi...');
            
            // Redirect with JWT
            const teacherEmail = user?.email || 'teacher@rv2class.com';
            const displayName = encodeURIComponent(JSON.stringify(teacherDisplayName));
            const email = encodeURIComponent(JSON.stringify(teacherEmail));
            
            // IMPORTANT: jwt parameter must be in URL for Jitsi to use it
            window.location.href = `/${roomName}?jwt=${data.jwt}#userInfo.email=${email}&userInfo.displayName=${displayName}`;
        } else {
            throw new Error('Failed to get JWT');
        }
        
    } catch (error) {
        console.error('❌ Failed to start meeting:', error);
        alert('Failed to start meeting. Please try again.');
    }
};

// ADD this function for lobby notifications:
function showLobbyNotification(participant, api) {
    // You can customize this notification UI
    const notification = confirm(`${participant.name} wants to join. Admit?`);
    
    if (notification) {
        // Admit student
        api.executeCommand('answerKnockingParticipant', participant.id, true);
        console.log('✅ Admitted:', participant.name);
    } else {
        // Reject student
        api.executeCommand('answerKnockingParticipant', participant.id, false);
        console.log('❌ Rejected:', participant.name);
    }
}

// ALTERNATIVE: If you want to embed Jitsi in your page
// Add this to your JSX:

/*
{user && (
    <div id="jitsi-container" style={{
        width: '100%',
        height: '600px',
        display: 'none' // Show only after clicking Start Meeting
    }} />
)}
*/

/**
 * SUMMARY OF CHANGES:
 * 
 * 1. Import jitsiJWTHelper functions
 * 2. Modify handleStartMeeting to:
 *    - Get Firebase ID token
 *    - Call JWT API to get teacher JWT
 *    - Either:
 *      a) Initialize Jitsi iframe with JWT, OR
 *      b) Redirect to Jitsi with JWT in URL
 * 3. Add lobby notification handler
 * 
 * BENEFITS:
 * - Teachers auto-admitted (bot recognizes moderator JWT)
 * - Students wait in lobby (no JWT = not moderator)
 * - Persistent lobby (bot maintains it 24/7)
 */
