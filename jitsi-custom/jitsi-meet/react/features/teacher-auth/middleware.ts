import { AnyAction } from 'redux';

import { IStore } from '../app/types';
import { CONFERENCE_FAILED, CONFERENCE_JOINED, CONFERENCE_WILL_JOIN } from '../base/conference/actionTypes';
import { conferenceWillJoin } from '../base/conference/actions.any';
import { JitsiConferenceErrors, JitsiConferenceEvents } from '../base/lib-jitsi-meet';
import { PARTICIPANT_ROLE } from '../base/participants/constants';
import { getLocalParticipant } from '../base/participants/functions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import StateListenerRegistry from '../base/redux/StateListenerRegistry';
import { parseURLParams } from '../base/util/parseURLParams';
import { hideLobbyScreen, openLobbyScreen, setPasswordJoinFailed, startKnocking } from '../lobby/actions.any';
import { isPrejoinPageVisible } from '../prejoin/functions.any';

/**
 * List of teacher email addresses that should bypass lobby and get auto-moderator.
 * These emails should match what's used in the Firebase auth system.
 */
const TEACHER_EMAILS = [
    'romanvolkonidov@gmail.com'
    // Add more teacher emails here as needed
];

/**
 * Check if an email belongs to a teacher.
 *
 * @param {string} email - The email to check.
 * @returns {boolean} True if the email is a teacher email.
 */
function isTeacherEmail(email: string): boolean {
    if (!email) {
        return false;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    return TEACHER_EMAILS.some(teacherEmail => 
        teacherEmail.toLowerCase() === normalizedEmail
    );
}

/**
 * Get the user email from URL parameters or settings.
 *
 * @param {IStore} store - The Redux store.
 * @returns {string|undefined} The email from URL parameters or settings.
 */
function getUserEmailFromURL(store: IStore): string | undefined {
    const state = store.getState();
    const locationURL = state['features/base/connection'].locationURL;
    
    if (!locationURL) {
        // Try to get from settings if not in URL
        const settings = state['features/base/settings'];
        return settings.email;
    }
    
    const urlParams = parseURLParams(locationURL);
    const email = urlParams['userInfo.email'];
    
    // Also check settings as fallback
    if (!email) {
        const settings = state['features/base/settings'];
        return settings.email;
    }
    
    return email;
}

/**
 * Check if a user is a teacher based on URL parameters or email.
 *
 * @param {IStore} store - The Redux store.
 * @returns {boolean} True if the user is a teacher.
 */
function isUserTeacher(store: IStore): boolean {
    const state = store.getState();
    const locationURL = state['features/base/connection'].locationURL;
    
    if (!locationURL) {
        return false;
    }
    
    const urlParams = locationURL ? parseURLParams(locationURL) : {};
    
    // Check if userType parameter explicitly says "teacher"
    const userType = urlParams['userInfo.userType'];
    console.log('[TeacherAuth] isUserTeacher check - userType value:', userType, 'type:', typeof userType);
    
    if (userType === 'teacher') {
        console.log('[TeacherAuth] ✅ User is TEACHER (from userType parameter)');
        return true;
    }
    
    // If explicitly marked as student, return false
    if (userType === 'student') {
        console.log('[TeacherAuth] ❌ User is STUDENT (from userType parameter)');
        return false;
    }
    
    // Fallback: check if email is in teacher list
    const email = getUserEmailFromURL(store);
    const isTeacher = email ? isTeacherEmail(email) : false;
    console.log('[TeacherAuth] Fallback email check - email:', email, 'isTeacher:', isTeacher);
    return isTeacher;
}

/**
 * Middleware for teacher access control - handles lobby bypass and auto-moderator.
 * 
 * NEW STRATEGY (Updated):
 * 1. Teachers ALWAYS bypass lobby and become moderators (even if not first)
 * 2. Students ALWAYS go to lobby screen (even if first to join)
 * 3. When teacher joins, lobby is enabled for students
 * 4. Teachers can admit students from participants panel
 * 
 * This ensures teachers never need to be admitted by anyone, and students
 * always wait for teacher approval, regardless of who joins first.
 */
MiddlewareRegistry.register(store => next => action => {
    switch (action.type) {
    case CONFERENCE_WILL_JOIN: {
        const isTeacher = isUserTeacher(store);
        const email = getUserEmailFromURL(store);
        const state = store.getState();
        const conference = action.conference;
        const locationURL = state['features/base/connection'].locationURL;
        const urlParams = locationURL ? parseURLParams(locationURL) : {};
        
        console.log('=== [TeacherAuth] CONFERENCE_WILL_JOIN ===');
        console.log('[TeacherAuth] URL params:', urlParams);
        console.log('[TeacherAuth] userInfo.userType:', urlParams['userInfo.userType']);
        console.log('[TeacherAuth] isTeacher:', isTeacher);
        console.log('[TeacherAuth] email:', email);
        console.log('[TeacherAuth] Conference object:', conference ? 'exists' : 'null');
        console.log('[TeacherAuth] Is members-only (lobby)?:', conference?.isMembersOnly ? conference.isMembersOnly() : 'unknown');
        
        if (isTeacher) {
            console.log('👨‍🏫 [TeacherAuth] TEACHER detected, will join directly as moderator');
            
            // Teachers always bypass lobby
            store.dispatch(hideLobbyScreen());
            
            // Pass action through - teacher joins directly
            // Server-side will grant owner/moderator role automatically
            return next(action);
        } else {
            console.log('👨‍🎓 [TeacherAuth] STUDENT detected - will be sent to lobby');
            
            // With server-side enable-auto-owner: false, students should automatically
            // be sent to lobby even if they're first to join
            
            // Check if server has already enabled members-only (lobby)
            const isMembersOnly = conference?.isMembersOnly && conference.isMembersOnly();
            
            console.log('[TeacherAuth] Server lobby active?', isMembersOnly);
            
            // Let student proceed to join - they'll automatically be put in lobby state
            // by the server or by our lobby logic
            return next(action);
        }
    }
    case CONFERENCE_JOINED:
        return _conferenceJoined(store, next, action);
    case CONFERENCE_FAILED: {
        const { error } = action;
        const isTeacher = isUserTeacher(store);
        const email = getUserEmailFromURL(store);
        
        // If teacher hits lobby restriction (room already has lobby enabled)
        if (error?.name === JitsiConferenceErrors.MEMBERS_ONLY_ERROR && isTeacher) {
            console.log('[TeacherAuth] Teacher hit lobby, bypassing and auto-approving:', email);
            
            // Hide lobby screen for teacher
            store.dispatch(hideLobbyScreen());
            
            // Clear the password join failed flag
            store.dispatch(setPasswordJoinFailed(false));
            
            // Teacher should knock and be auto-approved server-side
            // or just rejoin depending on server configuration
            store.dispatch(startKnocking());
        }
        
        break;
    }
    }

    return next(action);
});

/**
 * Handle CONFERENCE_FAILED - check if it's lobby-related and bypass for teachers.
 *
 * @param {IStore} store - The Redux store.
 * @param {Function} next - The Redux next function.
 * @param {AnyAction} action - The Redux action.
 * @returns {any}
 */
function _conferenceFailed(store: IStore, next: Function, action: AnyAction) {
    const { error } = action;
    const state = store.getState();
    const email = getUserEmailFromURL(store);
    
    // If teacher hits lobby restriction, bypass it
    if (error?.name === JitsiConferenceErrors.MEMBERS_ONLY_ERROR
        && email && isTeacherEmail(email)) {
        console.log('[TeacherAuth] Teacher hit lobby restriction, bypassing...', email);
        
        // Hide the lobby screen
        store.dispatch(hideLobbyScreen());
        
        // Clear the password join failed flag
        store.dispatch(setPasswordJoinFailed(false));
        
        // Try to rejoin - teachers should be allowed through
        const { conference } = state['features/base/conference'];
        if (conference) {
            // Re-join without showing lobby
            store.dispatch(conferenceWillJoin(conference));
        }
        
        return next(action);
    }
    
    return next(action);
}

/**
 * Handle CONFERENCE_JOINED - ensure teacher is moderator and enable lobby.
 *
 * @param {IStore} store - The Redux store.
 * @param {Function} next - The Redux next function.
 * @param {AnyAction} action - The Redux action.
 * @returns {any}
 */
function _conferenceJoined(store: IStore, next: Function, action: AnyAction) {
    const result = next(action);
    
    const isTeacher = isUserTeacher(store);
    const email = getUserEmailFromURL(store);
    const state = store.getState();
    const localParticipant = getLocalParticipant(state);
    const { conference } = state['features/base/conference'];
    
    console.log('=== [TeacherAuth] CONFERENCE_JOINED ===');
    console.log('[TeacherAuth] isTeacher:', isTeacher);
    console.log('[TeacherAuth] email:', email);
    console.log('[TeacherAuth] role:', localParticipant?.role);
    
    // CRITICAL: If a student somehow joined the conference (bypassed our block), kick them out!
    if (!isTeacher) {
        console.error('🚨 [TeacherAuth] STUDENT BYPASSED LOBBY BLOCK - This should not happen!');
        console.error('[TeacherAuth] Student role:', localParticipant?.role);
        console.error('[TeacherAuth] Conference:', conference ? 'exists' : 'null');
        
        // Force student back to lobby
        if (conference) {
            console.log('[TeacherAuth] Forcing student back to lobby...');
            store.dispatch(openLobbyScreen());
            conference.leave();
            
            // DON'T try to enable lobby - student isn't moderator
            // The teacher will enable lobby when they join
            
            // Start knocking again
            setTimeout(() => {
                store.dispatch(startKnocking());
            }, 500);
        }
        
        return result;
    }
    
    if (isTeacher) {
        console.log('👨‍🏫 [TeacherAuth] Teacher joined conference:', {
            email,
            role: localParticipant?.role,
            isPreJoinVisible: isPrejoinPageVisible(state)
        });
        
        // Ensure teacher is moderator
        if (localParticipant?.role === PARTICIPANT_ROLE.MODERATOR) {
            console.log('[TeacherAuth] ✅ Teacher is moderator - excellent!');
        } else {
            console.log('[TeacherAuth] ⚠️  Teacher is NOT moderator, requesting moderator role');
            
            // Request moderator role for teacher
            // In Jitsi, the first participant is automatically moderator
            // If a student joined first, we need to grant teacher moderator role
            if (conference) {
                try {
                    // Try to grant moderator role (if supported by server)
                    conference.grantOwner(localParticipant?.id);
                    console.log('[TeacherAuth] Requested moderator role for teacher');
                } catch (error) {
                    console.error('[TeacherAuth] Error granting moderator role:', error);
                }
            }
        }
        
        // Enable lobby so any future students must wait for approval
        setTimeout(() => {
            if (conference) {
                try {
                    conference.enableLobby();
                    console.log('[TeacherAuth] ✅ Lobby enabled - students will now knock before joining');
                } catch (error) {
                    // Lobby might already be enabled, that's fine
                    console.log('[TeacherAuth] Lobby enable status:', error);
                }
            }
        }, 1000); // Wait 1 second for teacher to fully join
    }
    
    return result;
}

/**
 * Register a state listener to monitor the local participant's role for teachers.
 */
StateListenerRegistry.register(
    state => {
        const localParticipant = getLocalParticipant(state);
        return localParticipant?.role;
    },
    (role, { getState, dispatch }) => {
        const locationURL = getState()['features/base/connection'].locationURL;
        
        if (!locationURL) {
            return;
        }
        
        const urlParams = locationURL ? parseURLParams(locationURL) : {};
        const userType = urlParams['userInfo.userType'];
        const isTeacher = userType === 'teacher';
        const email = urlParams['userInfo.email'] || getState()['features/base/settings'].email;
        
        if (isTeacher && email) {
            console.log('[TeacherAuth] Teacher role changed to:', role);
            
            if (role === PARTICIPANT_ROLE.MODERATOR) {
                console.log('[TeacherAuth] Teacher successfully became moderator');
            } else if (role) {
                console.log('[TeacherAuth] Warning: Teacher does not have moderator role');
            }
        }
    }
);

