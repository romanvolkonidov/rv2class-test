// Lazy load Excalidraw to prevent blocking
import React, { useCallback, useRef, useEffect, useState } from 'react';
import i18next from 'i18next';

const loadExcalidrawApp = async () => {
    try {
        const module = await import('@jitsi/excalidraw');
        return module.ExcalidrawApp;
    } catch (error) {
        console.error('Failed to load Excalidraw:', error);
        return null;
    }
};

import { WHITEBOARD_UI_OPTIONS } from '../../constants';

/**
 * Whiteboard wrapper for mobile.
 *
 * @returns {JSX.Element}
 */
const WhiteboardWrapper = ({
    className,
    collabDetails,
    collabServerUrl,
    localParticipantName
}: {
    className?: string;
    collabDetails: {
        roomId: string;
        roomKey: string;
    };
    collabServerUrl: string;
    localParticipantName: string;
}) => {
    const excalidrawRef = useRef<any>(null);
    const excalidrawAPIRef = useRef<any>(null);
    const collabAPIRef = useRef<any>(null);
    const [ ExcalidrawApp, setExcalidrawApp ] = useState<any>(null);

    // Lazy load Excalidraw when component mounts
    useEffect(() => {
        loadExcalidrawApp().then(app => {
            if (app) {
                setExcalidrawApp(() => app);
            }
        });
    }, []);

    const getExcalidrawAPI = useCallback(excalidrawAPI => {
        if (excalidrawAPIRef.current) {
            return;
        }
        excalidrawAPIRef.current = excalidrawAPI;
    }, []);

    const getCollabAPI = useCallback(collabAPI => {
        if (collabAPIRef.current) {
            return;
        }
        collabAPIRef.current = collabAPI;
        collabAPIRef.current.setUsername(localParticipantName);
    }, [ localParticipantName ]);

    return (
        <div className = { className }>
            <div className = 'excalidraw-wrapper'>
                {ExcalidrawApp ? (
                    <ExcalidrawApp
                        collabDetails = { collabDetails }
                        collabServerUrl = { collabServerUrl }
                        detectScroll = { true }
                        excalidraw = {{
                            isCollaborating: true,
                            langCode: i18next.language,

                            // @ts-ignore
                            ref: excalidrawRef,
                            theme: 'light',
                            UIOptions: WHITEBOARD_UI_OPTIONS
                        }}
                        getCollabAPI = { getCollabAPI }
                        getExcalidrawAPI = { getExcalidrawAPI } />
                ) : (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: '#fff',
                        fontSize: '18px'
                    }}>
                        Loading whiteboard...
                    </div>
                )}
            </div>


        </div>
    );
};

export default WhiteboardWrapper;
