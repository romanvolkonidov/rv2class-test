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
 * Middleware for teacher access control - JITSI DEFAULT BEHAVIOR
 * 
 * Strategy: Use Jitsi's standard lobby system
 * 1. First person joins → becomes moderator automatically (enable-auto-owner: true)
 * 2. Moderator enables lobby via UI
 * 3. Future joiners → held in lobby
 * 4. Moderator admits them
 * 
 * This middleware just logs user type for debugging.
 * All actual lobby logic is handled by Jitsi/Prosody default behavior.
 */
MiddlewareRegistry.register(store => next => action => {
    switch (action.type) {
    case CONFERENCE_WILL_JOIN: {
        const isTeacher = isUserTeacher(store);
        const state = store.getState();
        const locationURL = state['features/base/connection'].locationURL;
        const urlParams = locationURL ? parseURLParams(locationURL) : {};
        
        console.log('=== [TeacherAuth] CONFERENCE_WILL_JOIN (Default Jitsi Behavior) ===');
        console.log('[TeacherAuth] userInfo.userType:', urlParams['userInfo.userType']);
        console.log('[TeacherAuth] isTeacher:', isTeacher);
        console.log('[TeacherAuth] Allowing all users to join normally - server handles lobby');
        
        // Just pass through - Jitsi handles everything
        return next(action);
    }
    case CONFERENCE_JOINED:
        return _conferenceJoined(store, next, action);
    case CONFERENCE_FAILED: {
        // Just log for debugging
        const { error } = action;
        const isTeacher = isUserTeacher(store);
        
        console.log('[TeacherAuth] CONFERENCE_FAILED - isTeacher:', isTeacher, 'error:', error?.name);
        
        // Let default Jitsi error handling take over
        break;
    }
    }

    return next(action);
});

/**
 * Handle CONFERENCE_JOINED - just log for debugging.
 * All lobby functionality is handled by Jitsi default behavior.
 *
 * @param {IStore} store - The Redux store.
 * @param {Function} next - The Redux next function.
 * @param {AnyAction} action - The Redux action.
 * @returns {any}
 */
function _conferenceJoined(store: IStore, next: Function, action: AnyAction) {
    const result = next(action);
    
    const isTeacher = isUserTeacher(store);
    const state = store.getState();
    const localParticipant = getLocalParticipant(state);
    
    console.log('=== [TeacherAuth] CONFERENCE_JOINED ===');
    console.log('[TeacherAuth] isTeacher:', isTeacher);
    console.log('[TeacherAuth] role:', localParticipant?.role);
    console.log('[TeacherAuth] First person becomes moderator automatically (enable-auto-owner: true)');
    
    return result;
}

