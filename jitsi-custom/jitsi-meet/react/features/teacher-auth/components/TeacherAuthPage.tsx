import React, { useEffect, useState } from 'react';
import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()(theme => ({
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1E1E1E'
    },
    content: {
        background: '#292929',
        padding: '40px',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center'
    },
    title: {
        color: '#E7E7E7',
        fontSize: '32px',
        marginBottom: '8px',
        fontWeight: 600
    },
    subtitle: {
        color: '#E7E7E7',
        fontSize: '24px',
        marginBottom: '8px',
        fontWeight: 500
    },
    description: {
        color: '#A4B5B8',
        fontSize: '14px',
        marginBottom: '32px'
    },
    googleButton: {
        width: '100%',
        padding: '16px',
        background: '#3D7CC9',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        cursor: 'pointer',
        fontWeight: 600,
        transition: 'background 0.2s',
        '&:hover': {
            background: '#4A8BD6'
        },
        '&:disabled': {
            opacity: 0.6,
            cursor: 'not-allowed'
        }
    },
    error: {
        color: '#E15350',
        marginTop: '16px',
        fontSize: '14px'
    },
    dashboardContent: {
        maxWidth: '500px'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '1px solid #3A3A3A'
    },
    avatar: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        border: '2px solid #3D7CC9',
        marginRight: '16px'
    },
    userInfo: {
        flex: 1,
        textAlign: 'left'
    },
    userName: {
        color: '#E7E7E7',
        fontSize: '20px',
        fontWeight: 600,
        marginBottom: '4px'
    },
    userRole: {
        color: '#A4B5B8',
        fontSize: '14px'
    },
    logoutButton: {
        padding: '8px 16px',
        background: 'transparent',
        color: '#A4B5B8',
        border: '1px solid #525A5E',
        borderRadius: '4px',
        fontSize: '14px',
        cursor: 'pointer',
        '&:hover': {
            background: '#2A2A2A'
        }
    },
    actionButtons: {
        display: 'flex',
        gap: '12px',
        marginTop: '24px'
    },
    startButton: {
        flex: 1,
        padding: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)'
        }
    },
    studentsButton: {
        flex: 1,
        padding: '16px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)'
        }
    }
}));

declare global {
    interface Window {
        firebaseAuth: any;
        firebaseApp: any;
    }
}

const TeacherAuthPage = () => {
    const { classes } = useStyles();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signingIn, setSigningIn] = useState(false);
    const [error, setError] = useState('');
    const [firebaseReady, setFirebaseReady] = useState(false);

    useEffect(() => {
        // Load Firebase scripts
        const loadFirebase = async () => {
            if (window.firebaseAuth && window.firebaseApp) {
                setFirebaseReady(true);
                initializeAuth();
                return;
            }

            try {
                // Load Firebase App
                const appScript = document.createElement('script');
                appScript.type = 'module';
                appScript.textContent = `
                    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
                    import * as firebaseAuth from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
                    
                    window.firebaseApp = initializeApp;
                    window.firebaseAuth = firebaseAuth;
                    window.dispatchEvent(new Event('firebaseLoaded'));
                `;
                document.head.appendChild(appScript);

                await new Promise((resolve) => {
                    window.addEventListener('firebaseLoaded', resolve, { once: true });
                });

                setFirebaseReady(true);
                initializeAuth();
            } catch (err) {
                console.error('Failed to load Firebase:', err);
                setError('Failed to load authentication');
                setLoading(false);
            }
        };

        loadFirebase();
    }, []);

    const initializeAuth = () => {
        const firebaseConfig = {
            apiKey: "AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004",
            authDomain: "tracking-budget-app.firebaseapp.com",
            databaseURL: "https://tracking-budget-app-default-rtdb.firebaseio.com",
            projectId: "tracking-budget-app",
            storageBucket: "tracking-budget-app.appspot.com",
            messagingSenderId: "912992088190",
            appId: "1:912992088190:web:926c8826b3bc39e2eb282f"
        };

        const app = window.firebaseApp(firebaseConfig);
        const auth = window.firebaseAuth.getAuth(app);

        window.firebaseAuth.onAuthStateChanged(auth, (currentUser: any) => {
            setUser(currentUser);
            setLoading(false);
        });
    };

    const handleGoogleSignIn = async () => {
        if (!firebaseReady) return;
        
        setSigningIn(true);
        setError('');
        
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004",
                authDomain: "tracking-budget-app.firebaseapp.com",
                databaseURL: "https://tracking-budget-app-default-rtdb.firebaseio.com",
                projectId: "tracking-budget-app",
                storageBucket: "tracking-budget-app.appspot.com",
                messagingSenderId: "912992088190",
                appId: "1:912992088190:web:926c8826b3bc39e2eb282f"
            };

            const app = window.firebaseApp(firebaseConfig);
            const auth = window.firebaseAuth.getAuth(app);
            const provider = new window.firebaseAuth.GoogleAuthProvider();
            
            await window.firebaseAuth.signInWithPopup(auth, provider);
        } catch (err: any) {
            console.error('Sign in error:', err);
            setError('Failed to sign in. Please try again.');
            setSigningIn(false);
        }
    };

    const handleLogout = async () => {
        if (!firebaseReady) return;
        
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004",
                authDomain: "tracking-budget-app.firebaseapp.com",
                databaseURL: "https://tracking-budget-app-default-rtdb.firebaseio.com",
                projectId: "tracking-budget-app",
                storageBucket: "tracking-budget-app.appspot.com",
                messagingSenderId: "912992088190",
                appId: "1:912992088190:web:926c8826b3bc39e2eb282f"
            };

            const app = window.firebaseApp(firebaseConfig);
            const auth = window.firebaseAuth.getAuth(app);
            await window.firebaseAuth.signOut(auth);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const handleStartMeeting = () => {
        const roomName = `teacher-room-${Date.now()}`;
        window.location.href = `/${roomName}`;
    };

    const handleViewStudents = () => {
        window.location.href = '/static/students.html';
    };

    if (loading) {
        return (
            <div className={classes.container}>
                <div className={classes.content}>
                    <p className={classes.description}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        // Show login screen
        return (
            <div className={classes.container}>
                <div className={classes.content}>
                    <h1 className={classes.title}>RV2Class</h1>
                    <h2 className={classes.subtitle}>Welcome!</h2>
                    <p className={classes.description}>Sign in to join your virtual classroom</p>
                    <button 
                        className={classes.googleButton}
                        onClick={handleGoogleSignIn}
                        disabled={signingIn || !firebaseReady}
                    >
                        {signingIn ? 'Signing in...' : 'Continue with Google'}
                    </button>
                    {error && <p className={classes.error}>{error}</p>}
                </div>
            </div>
        );
    }

    // Show teacher dashboard
    return (
        <div className={classes.container}>
            <div className={`${classes.content} ${classes.dashboardContent}`}>
                <div className={classes.header}>
                    {user.photoURL && (
                        <img 
                            src={user.photoURL} 
                            alt="Avatar" 
                            className={classes.avatar}
                        />
                    )}
                    <div className={classes.userInfo}>
                        <div className={classes.userName}>{user.displayName || 'Teacher'}</div>
                        <div className={classes.userRole}>Teacher</div>
                    </div>
                    <button 
                        className={classes.logoutButton}
                        onClick={handleLogout}
                    >
                        Sign out
                    </button>
                </div>

                <h2 className={classes.subtitle}>What would you like to do?</h2>
                
                <div className={classes.actionButtons}>
                    <button 
                        className={classes.startButton}
                        onClick={handleStartMeeting}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        Start Meeting
                    </button>
                    <button 
                        className={classes.studentsButton}
                        onClick={handleViewStudents}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        Students
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeacherAuthPage;
