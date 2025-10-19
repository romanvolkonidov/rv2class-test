import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../../app/types';
import ActionButton from '../../../../base/premeeting/components/web/ActionButton';
import PreMeetingScreen from '../../../../base/premeeting/components/web/PreMeetingScreen';
import { signInWithGoogle } from '../../actions';

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
        title: {
            fontSize: '24px',
            fontWeight: 600,
            color: theme.palette.text01,
            marginBottom: theme.spacing(2),
            textAlign: 'center'
        },
        subtitle: {
            fontSize: '14px',
            color: theme.palette.text02,
            marginBottom: theme.spacing(4),
            textAlign: 'center'
        },
        googleButton: {
            width: '100%',
            marginTop: theme.spacing(2)
        },
        error: {
            color: theme.palette.error01,
            fontSize: '14px',
            marginTop: theme.spacing(2),
            textAlign: 'center'
        },
        logo: {
            fontSize: '32px',
            fontWeight: 700,
            color: theme.palette.action01,
            marginBottom: theme.spacing(1),
            textAlign: 'center'
        }
    };
});

const AuthPage: React.FC = () => {
    const { classes } = useStyles();
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state: IReduxState) => state['features/auth']);

    const handleGoogleSignIn = () => {
        dispatch(signInWithGoogle());
    };

    return (
        <PreMeetingScreen
            showDeviceStatus = { false }
            title = ''
            videoMuted = { true }>
            <div className = { classes.content }>
                <div className = { classes.logo }>RV2Class</div>
                <div className = { classes.title }>Welcome!</div>
                <div className = { classes.subtitle }>
                    Sign in to join your virtual classroom
                </div>

                <ActionButton
                    className = { classes.googleButton }
                    disabled = { loading }
                    onClick = { handleGoogleSignIn }
                    type = 'primary'>
                    {loading ? 'Signing in...' : 'Continue with Google'}
                </ActionButton>

                {error && (
                    <div className = { classes.error }>
                        {error}
                    </div>
                )}
            </div>
        </PreMeetingScreen>
    );
};

export default AuthPage;
