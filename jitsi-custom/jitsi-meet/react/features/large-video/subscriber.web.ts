// @ts-ignore - VideoLayout is a JavaScript module without type declarations
import VideoLayout from '../../../modules/UI/videolayout/VideoLayout';
import StateListenerRegistry from '../base/redux/StateListenerRegistry';
import { getVideoTrackByParticipant } from '../base/tracks/functions.web';

import { getLargeVideoParticipant } from './functions';
import './subscriber.any';

/**
 * Helper function to send video dimensions to parent window
 */
function sendVideoDimensionsToParent() {
    const largeVideo = document.getElementById('largeVideo') as HTMLVideoElement;
    
    console.log('🔍 Checking video dimensions:', {
        elementExists: !!largeVideo,
        videoWidth: largeVideo?.videoWidth,
        videoHeight: largeVideo?.videoHeight,
        clientWidth: largeVideo?.clientWidth,
        clientHeight: largeVideo?.clientHeight,
        isInIframe: window.parent !== window,
        readyState: largeVideo?.readyState
    });
    
    if (largeVideo && largeVideo.videoWidth > 0 && window.parent !== window) {
        window.parent.postMessage({
            type: 'JITSI_VIDEO_DIMENSIONS',
            videoWidth: largeVideo.videoWidth,
            videoHeight: largeVideo.videoHeight,
            displayWidth: largeVideo.clientWidth,
            displayHeight: largeVideo.clientHeight
        }, '*');
        console.log('📤 Sent video dimensions to parent:', {
            videoWidth: largeVideo.videoWidth,
            videoHeight: largeVideo.videoHeight,
            displayWidth: largeVideo.clientWidth,
            displayHeight: largeVideo.clientHeight
        });
        return true;
    }
    return false;
}

/**
 * Updates the on stage participant video.
 */
StateListenerRegistry.register(
    /* selector */ state => state['features/large-video'].participantId,
    /* listener */ participantId => {
        VideoLayout.updateLargeVideo(participantId, true);
        
        // 🎯 Send video dimensions to parent window for annotation sync
        // Try immediately
        setTimeout(() => {
            if (!sendVideoDimensionsToParent()) {
                // If failed (video not ready), retry a few times
                console.log('⏳ Video not ready, will retry...');
                let retries = 0;
                const maxRetries = 10;
                const retryInterval = setInterval(() => {
                    if (sendVideoDimensionsToParent() || retries++ >= maxRetries) {
                        clearInterval(retryInterval);
                        if (retries >= maxRetries) {
                            console.warn('⚠️ Failed to send video dimensions after', maxRetries, 'retries');
                        }
                    }
                }, 200);
            }
        }, 100);
    }
);

/**
 * Set up video element listeners to send dimensions when video loads or resizes
 */
if (typeof window !== 'undefined' && window.parent !== window) {
    // Use MutationObserver to watch for largeVideo element changes
    const observer = new MutationObserver(() => {
        const largeVideo = document.getElementById('largeVideo') as HTMLVideoElement;
        if (largeVideo && !largeVideo.dataset.dimensionsListenerAttached) {
            console.log('🎬 Attaching dimension listeners to largeVideo element');
            largeVideo.dataset.dimensionsListenerAttached = 'true';
            
            // Send dimensions when video metadata loads
            largeVideo.addEventListener('loadedmetadata', () => {
                console.log('📹 Video metadata loaded');
                sendVideoDimensionsToParent();
            });
            
            // Send dimensions when video resizes
            largeVideo.addEventListener('resize', () => {
                console.log('📐 Video resized');
                sendVideoDimensionsToParent();
            });
            
            // Send dimensions when video starts playing
            largeVideo.addEventListener('playing', () => {
                console.log('▶️ Video playing');
                sendVideoDimensionsToParent();
            });
        }
    });
    
    // Start observing the document for largeVideo element
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Schedules a large video update when the streaming status of the track associated with the large video changes.
 */
StateListenerRegistry.register(
    /* selector */ state => {
        const largeVideoParticipant = getLargeVideoParticipant(state);
        const videoTrack = getVideoTrackByParticipant(state, largeVideoParticipant);

        return {
            participantId: largeVideoParticipant?.id,
            streamingStatus: videoTrack?.streamingStatus
        };
    },
    /* listener */ ({ participantId, streamingStatus }, previousState: any = {}) => {
        if (streamingStatus !== previousState.streamingStatus) {
            VideoLayout.updateLargeVideo(participantId, true);
            
            // 🎯 Send updated video dimensions when streaming status changes
            setTimeout(() => {
                const largeVideo = document.getElementById('largeVideo') as HTMLVideoElement;
                if (largeVideo && largeVideo.videoWidth > 0 && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'JITSI_VIDEO_DIMENSIONS',
                        videoWidth: largeVideo.videoWidth,
                        videoHeight: largeVideo.videoHeight,
                        displayWidth: largeVideo.clientWidth,
                        displayHeight: largeVideo.clientHeight
                    }, '*');
                }
            }, 100);
        }
    }, {
        deepEquals: true
    }
);
