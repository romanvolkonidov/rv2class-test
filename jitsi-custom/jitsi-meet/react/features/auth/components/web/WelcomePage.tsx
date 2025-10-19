import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../../app/types';
import ActionButton from '../../../../base/premeeting/components/web/ActionButton';
import PreMeetingScreen from '../../../../base/premeeting/components/web/PreMeetingScreen';
import { proceedToPrejoin, signOut } from '../../actions';

const useStyles = makeStyles()(theme => {
    return {
        content: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto',
            padding: theme.spacing(3)
        },
        userInfo: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: theme.spacing(3),
            backgroundColor: theme.palette.ui02,
            borderRadius: theme.shape.borderRadius,
            marginBottom: theme.spacing(3),
            width: '100%'
        },
        avatar: {
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            marginBottom: theme.spacing(2),
            border: `3px solid ${theme.palette.action01}`
        },
        userName: {
            fontSize: '20px',
            fontWeight: 600,
            color: theme.palette.text01,
            marginBottom: theme.spacing(0.5)
        },
        userEmail: {
            fontSize: '14px',
            color: theme.palette.text02
        },
        startButton: {
            width: '100%',
            marginBottom: theme.spacing(2)
        },
        logoutButton: {
            width: '100%'
        },
        title: {
            fontSize: '24px',
            fontWeight: 600,
            color: theme.palette.text01,
            marginBottom: theme.spacing(3),
            textAlign: 'center'
        }
    };
});

const WelcomePage: React.FC = () => {
    const { classes } = useStyles();
    const dispatch = useDispatch();
    const { user } = useSelector((state: IReduxState) => state['features/auth']);

    const handleStart = () => {
        dispatch(proceedToPrejoin());
    };

    const handleLogout = () => {
        dispatch(signOut());
    };

    if (!user) {
        return null;
    }

    return (
        <PreMeetingScreen
            showDeviceStatus = { false }
            title = ''
            videoMuted = { true }>
            <div className = { classes.content }>
                <div className = { classes.title }>Ready to join?</div>

                <div className = { classes.userInfo }>
                    <img
                        alt = 'User avatar'
                        className = { classes.avatar }
                        src = { user.photoURL || 'https://via.placeholder.com/80' } />
                    <div className = { classes.userName }>
                        {user.displayName || 'User'}
                    </div>
                    <div className = { classes.userEmail }>
                        {user.email}
                    </div>
                </div>

                <ActionButton
                    className = { classes.startButton }
                    onClick = { handleStart }
                    type = 'primary'>
                    Start
                </ActionButton>

                <ActionButton
                    className = { classes.logoutButton }
                    onClick = { handleLogout }
                    type = 'secondary'>
                    Sign out
                </ActionButton>
            </div>
        </PreMeetingScreen>
    );
};

export default WelcomePage;
