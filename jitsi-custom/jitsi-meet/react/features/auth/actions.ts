import { signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { ref, set } from 'firebase/database';

import { auth, database, googleProvider } from './firebase';
import { SET_AUTH_USER, SET_AUTH_LOADING, SET_AUTH_ERROR, PROCEED_TO_PREJOIN } from './actionTypes';

/**
 * Sets the authenticated user.
 *
 * @param {User | null} user - The Firebase user object.
 * @returns {{
 *     type: SET_AUTH_USER,
 *     user: User | null
 * }}
 */
export function setAuthUser(user: User | null) {
    return {
        type: SET_AUTH_USER,
        user
    };
}

/**
 * Sets the authentication loading state.
 *
 * @param {boolean} loading - Whether authentication is in progress.
 * @returns {{
 *     type: SET_AUTH_LOADING,
 *     loading: boolean
 * }}
 */
export function setAuthLoading(loading: boolean) {
    return {
        type: SET_AUTH_LOADING,
        loading
    };
}

/**
 * Sets the authentication error.
 *
 * @param {string | null} error - The error message.
 * @returns {{
 *     type: SET_AUTH_ERROR,
 *     error: string | null
 * }}
 */
export function setAuthError(error: string | null) {
    return {
        type: SET_AUTH_ERROR,
        error
    };
}

/**
 * Proceeds from welcome page to prejoin.
 *
 * @returns {{
 *     type: PROCEED_TO_PREJOIN
 * }}
 */
export function proceedToPrejoin() {
    return {
        type: PROCEED_TO_PREJOIN
    };
}

/**
 * Signs in with Google.
 *
 * @returns {Function}
 */
export function signInWithGoogle() {
    return async (dispatch: any) => {
        dispatch(setAuthLoading(true));
        dispatch(setAuthError(null));

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Save user to database
            await set(ref(database, `users/${user.uid}`), {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: Date.now()
            });

            dispatch(setAuthUser(user));
            dispatch(setAuthLoading(false));
        } catch (error: any) {
            console.error('Sign in error:', error);
            dispatch(setAuthError(error.message || 'Failed to sign in'));
            dispatch(setAuthLoading(false));
        }
    };
}

/**
 * Signs out the current user.
 *
 * @returns {Function}
 */
export function signOut() {
    return async (dispatch: any) => {
        try {
            await firebaseSignOut(auth);
            dispatch(setAuthUser(null));
            dispatch(setAuthError(null));
        } catch (error: any) {
            console.error('Sign out error:', error);
            dispatch(setAuthError(error.message || 'Failed to sign out'));
        }
    };
}
