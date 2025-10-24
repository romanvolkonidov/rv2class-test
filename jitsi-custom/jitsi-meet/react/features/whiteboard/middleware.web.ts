// Static import - Excalidraw is bundled with main app
import { generateCollaborationLinkData } from '@jitsi/excalidraw';

import { AnyAction } from 'redux';

import { IStore } from '../app/types';
import { getCurrentConference } from '../base/conference/functions';
import { hideDialog, openDialog } from '../base/dialog/actions';
import { isDialogOpen } from '../base/dialog/functions';
import { participantJoined, participantLeft, pinParticipant } from '../base/participants/actions';
import { FakeParticipant } from '../base/participants/types';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { getCurrentRoomId } from '../breakout-rooms/functions';
import { addStageParticipant } from '../filmstrip/actions.web';
import { isStageFilmstripAvailable } from '../filmstrip/functions.web';

import { RESET_WHITEBOARD, SET_WHITEBOARD_OPEN } from './actionTypes';
import {
    notifyWhiteboardLimit,
    restrictWhiteboard,
    setupWhiteboard
} from './actions';
import WhiteboardLimitDialog from './components/web/WhiteboardLimitDialog';
import { WHITEBOARD_ID, WHITEBOARD_PARTICIPANT_NAME } from './constants';
import {
    generateCollabServerUrl,
    getCollabDetails,
    isWhiteboardPresent,
    shouldEnforceUserLimit,
    shouldNotifyUserLimit
} from './functions';
import { WhiteboardStatus } from './types';

import './middleware.any';

const focusWhiteboard = (store: IStore) => {
    console.log('🎨 focusWhiteboard called');
    const { dispatch, getState } = store;
    const state = getState();
    const conference = getCurrentConference(state);
    const stageFilmstrip = isStageFilmstripAvailable(state);
    const isPresent = isWhiteboardPresent(state);

    console.log('🎨 focusWhiteboard state:', { stageFilmstrip, isPresent });

    if (!isPresent) {
        console.log('🎨 Adding whiteboard as fake participant');
        dispatch(participantJoined({
            conference,
            fakeParticipant: FakeParticipant.Whiteboard,
            id: WHITEBOARD_ID,
            name: WHITEBOARD_PARTICIPANT_NAME
        }));
    }
    if (stageFilmstrip) {
        console.log('🎨 Adding whiteboard to stage');
        dispatch(addStageParticipant(WHITEBOARD_ID, true));
    } else {
        console.log('🎨 Pinning whiteboard participant');
        dispatch(pinParticipant(WHITEBOARD_ID));
    }
};

/**
 * Middleware which intercepts whiteboard actions to handle changes to the related state.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register((store: IStore) => (next: Function) => (action: AnyAction) => {
    const { dispatch, getState } = store;
    const state = getState();
    const conference = getCurrentConference(state);

    switch (action.type) {
    case SET_WHITEBOARD_OPEN: {
        console.log('🎨 SET_WHITEBOARD_OPEN action received, isOpen:', action.isOpen);
        const existingCollabDetails = getCollabDetails(state);
        console.log('🎨 existingCollabDetails:', existingCollabDetails);
        const enforceUserLimit = shouldEnforceUserLimit(state);
        const notifyUserLimit = shouldNotifyUserLimit(state);
        const iAmRecorder = Boolean(state['features/base/config'].iAmRecorder);

        if (enforceUserLimit) {
            console.log('🎨 User limit enforced, blocking whiteboard');
            dispatch(restrictWhiteboard(false));
            dispatch(openDialog(WhiteboardLimitDialog));
            iAmRecorder && setTimeout(() => dispatch(hideDialog(WhiteboardLimitDialog)), 3000);

            return next(action);
        }

        if (!existingCollabDetails) {
            console.log('🎨 No existing collab details, calling setNewWhiteboardOpen');
            setNewWhiteboardOpen(store);

            return next(action);
        }

        if (action.isOpen) {
            console.log('🎨 Existing collab details found, opening existing whiteboard');
            if (enforceUserLimit) {
                dispatch(restrictWhiteboard());

                return next(action);
            }

            if (notifyUserLimit) {
                dispatch(notifyWhiteboardLimit());
            }

            if (isDialogOpen(state, WhiteboardLimitDialog)) {
                dispatch(hideDialog(WhiteboardLimitDialog));
            }

            console.log('🎨 Calling focusWhiteboard');
            focusWhiteboard(store);
            raiseWhiteboardNotification(WhiteboardStatus.SHOWN);

            return next(action);
        }

        dispatch(participantLeft(WHITEBOARD_ID, conference, { fakeParticipant: FakeParticipant.Whiteboard }));
        raiseWhiteboardNotification(WhiteboardStatus.HIDDEN);

        break;
    }
    case RESET_WHITEBOARD: {
        dispatch(participantLeft(WHITEBOARD_ID, conference, { fakeParticipant: FakeParticipant.Whiteboard }));
        raiseWhiteboardNotification(WhiteboardStatus.RESET);

        break;
    }
    }

    return next(action);
});

/**
 * Raises the whiteboard status notifications changes (if API is enabled).
 *
 * @param {WhiteboardStatus} status - The whiteboard changed status.
 * @returns {Function}
 */
function raiseWhiteboardNotification(status: WhiteboardStatus) {
    if (typeof APP !== 'undefined') {
        APP.API.notifyWhiteboardStatusChanged(status);
    }
}

/**
 * Sets a new whiteboard open.
 *
 * @param {IStore} store - The redux store.
 * @returns {Promise}
 */
async function setNewWhiteboardOpen(store: IStore) {
    console.log('🎨 setNewWhiteboardOpen called');
    const { dispatch, getState } = store;
    
    try {
        console.log('🎨 Generating collab link data...');
        const collabLinkData = await generateCollaborationLinkData();
        console.log('🎨 Collab link data generated:', collabLinkData);
        
        const state = getState();
        const conference = getCurrentConference(state);
        const collabServerUrl = generateCollabServerUrl(state);
        const roomId = getCurrentRoomId(state);
        const collabData = {
            collabDetails: {
                roomId,
                roomKey: collabLinkData.roomKey
            },
            collabServerUrl
        };

        console.log('🎨 Focusing whiteboard and setting up...');
        focusWhiteboard(store);
        dispatch(setupWhiteboard(collabData));
        conference?.getMetadataHandler().setMetadata(WHITEBOARD_ID, collabData);
        raiseWhiteboardNotification(WhiteboardStatus.INSTANTIATED);
        console.log('🎨 Whiteboard setup complete');
    } catch (error) {
        console.error('🎨 Error in setNewWhiteboardOpen:', error);
    }
}
