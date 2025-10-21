import React, { useEffect, useState } from 'react';
import { makeStyles } from 'tss-react/mui';
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../base/firebase/firebase';

// Firebase Auth global (loaded from firebase_config.js)
declare global {
    interface Window {
        firebaseAuth: any;
    }
}

const useStyles = makeStyles()((theme) => ({
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '16px'
    },
    containerDark: {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
    },
    maxWidth: {
        maxWidth: '1280px',
        margin: '0 auto'
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
        marginTop: '32px'
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        '@media (min-width: 768px)': {
            fontSize: '3rem'
        }
    },
    titleDark: {
        color: '#ffffff'
    },
    subtitle: {
        fontSize: '1.125rem',
        color: '#d1d5db'
    },
    subtitleDark: {
        color: '#d1d5db'
    },
    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 0'
    },
    spinner: {
        width: '32px',
        height: '32px',
        border: '3px solid rgba(59, 130, 246, 0.3)',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: '$spin 1s linear infinite'
    },
    '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
    },
    card: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        marginBottom: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    cardDark: {
        background: 'rgba(30, 41, 59, 0.7)'
    },
    cardHeader: {
        marginBottom: '16px'
    },
    cardTitle: {
        fontSize: '1.5rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#ffffff'
    },
    cardTitleDark: {
        color: '#ffffff'
    },
    cardDescription: {
        fontSize: '0.875rem',
        color: '#9ca3af',
        marginTop: '4px'
    },
    cardDescriptionDark: {
        color: '#9ca3af'
    },
    sectionSpace: {
        marginTop: '24px'
    },
    groupCard: {
        border: '2px solid rgba(75, 85, 99, 0.5)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        background: 'rgba(17, 24, 39, 0.3)'
    },
    groupCardDark: {
        borderColor: 'rgba(75, 85, 99, 0.5)'
    },
    groupHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
    },
    groupHeaderButton: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0',
        transition: 'opacity 0.2s',
        '&:hover': {
            opacity: 0.8
        }
    },
    groupTitle: {
        fontSize: '1.125rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        textTransform: 'capitalize'
    },
    groupCount: {
        fontSize: '0.875rem',
        color: '#9ca3af'
    },
    groupCountDark: {
        color: '#9ca3af'
    },
    colorDot: {
        width: '16px',
        height: '16px',
        borderRadius: '50%'
    },
    buttonGroup: {
        display: 'flex',
        gap: '8px'
    },
    button: {
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        border: '1px solid',
        '&:hover': {
            transform: 'translateY(-1px)'
        },
        '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    },
    buttonOutline: {
        background: 'rgba(55, 65, 81, 0.3)',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        color: '#d1d5db',
        '&:hover': {
            background: 'rgba(55, 65, 81, 0.6)'
        }
    },
    buttonOutlineDark: {
        borderColor: 'rgba(75, 85, 99, 0.5)',
        color: '#d1d5db',
        '&:hover': {
            background: 'rgba(55, 65, 81, 0.6)'
        }
    },
    buttonDestructive: {
        background: '#ef4444',
        borderColor: '#ef4444',
        color: '#ffffff',
        '&:hover': {
            background: '#dc2626'
        }
    },
    expandedStudents: {
        marginTop: '16px',
        paddingLeft: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    studentCard: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        background: 'rgba(17, 24, 39, 0.6)',
        borderRadius: '8px',
        border: '1px solid rgba(55, 65, 81, 0.5)'
    },
    studentCardDark: {
        background: 'rgba(17, 24, 39, 0.6)',
        borderColor: 'rgba(55, 65, 81, 0.5)'
    },
    studentInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    studentName: {
        fontWeight: '500',
        color: '#ffffff'
    },
    studentNameDark: {
        color: '#ffffff'
    },
    teacherBadge: {
        fontSize: '0.75rem',
        padding: '2px 8px',
        borderRadius: '9999px',
        display: 'inline-block'
    },
    individualCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        background: 'rgba(255, 255, 255, 0.6)',
        transition: 'box-shadow 0.2s',
        '@media (min-width: 640px)': {
            flexDirection: 'row',
            alignItems: 'center'
        },
        '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }
    },
    individualCardDark: {
        background: 'rgba(17, 24, 39, 0.4)',
        borderColor: '#374151'
    },
    studentDetails: {
        flex: 1
    },
    studentHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        flexWrap: 'wrap'
    },
    studentNameLarge: {
        fontWeight: '600',
        color: '#111827'
    },
    studentNameLargeDark: {
        color: '#ffffff'
    },
    linkInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.875rem',
        color: '#6b7280',
        marginBottom: '8px'
    },
    linkInfoDark: {
        color: '#9ca3af'
    },
    linkCode: {
        fontSize: '0.75rem',
        background: '#f3f4f6',
        padding: '4px 8px',
        borderRadius: '4px',
        fontFamily: 'monospace'
    },
    linkCodeDark: {
        background: '#1f2937'
    },
    subjectBadges: {
        display: 'flex',
        gap: '8px',
        marginTop: '8px'
    },
    subjectBadge: {
        fontSize: '0.75rem',
        padding: '4px 8px',
        borderRadius: '4px'
    },
    tagSelector: {
        marginTop: '8px'
    },
    tagLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        marginBottom: '4px',
        display: 'block'
    },
    tagLabelDark: {
        color: '#9ca3af'
    },
    tagDots: {
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap'
    },
    tagDot: {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: '2px solid',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
            transform: 'scale(1.1)'
        }
    },
    tagDotActive: {
        transform: 'scale(1.1)',
        borderColor: '#111827',
        boxShadow: '0 0 0 2px #111827'
    },
    tagDotActiveDark: {
        borderColor: '#ffffff',
        boxShadow: '0 0 0 2px #ffffff'
    },
    tagDotInactive: {
        borderColor: '#d1d5db'
    },
    tagDotInactiveDark: {
        borderColor: '#4b5563'
    },
    removeTagButton: {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: '2px solid #d1d5db',
        background: 'transparent',
        color: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '0.875rem',
        transition: 'all 0.2s',
        '&:hover': {
            background: '#f3f4f6'
        }
    },
    removeTagButtonDark: {
        borderColor: '#4b5563',
        color: '#9ca3af',
        '&:hover': {
            background: '#374151'
        }
    },
    actions: {
        display: 'flex',
        gap: '8px'
    },
    emptyState: {
        padding: '48px 20px',
        textAlign: 'center'
    },
    emptyIcon: {
        fontSize: '4rem',
        marginBottom: '16px'
    },
    emptyText: {
        color: '#6b7280',
        fontSize: '1.125rem'
    },
    emptyTextDark: {
        color: '#9ca3af'
    },
    footer: {
        marginTop: '32px',
        textAlign: 'center',
        display: 'flex',
        gap: '8px',
        justifyContent: 'center'
    },
    footerText: {
        marginTop: '32px',
        textAlign: 'center',
        fontSize: '0.875rem',
        color: '#6b7280'
    },
    footerTextDark: {
        color: '#9ca3af'
    },
    addButton: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#ffffff',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 12px rgba(16, 185, 129, 0.4)'
        }
    },
    addFormContainer: {
        background: 'rgba(31, 41, 55, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '2px solid #10b981'
    },
    formGroup: {
        marginBottom: '16px'
    },
    label: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#d1d5db',
        marginBottom: '8px'
    },
    input: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #4b5563',
        background: 'rgba(17, 24, 39, 0.6)',
        color: '#ffffff',
        fontSize: '1rem',
        '&:focus': {
            outline: 'none',
            borderColor: '#10b981'
        }
    },
    checkboxGroup: {
        display: 'flex',
        gap: '16px'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#d1d5db',
        cursor: 'pointer'
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer'
    },
    formActions: {
        display: 'flex',
        gap: '12px',
        marginTop: '24px'
    }
}));

const TAG_COLORS = {
    red: { bg: 'rgba(254, 226, 226, 0.8)', text: '#991b1b', dot: '#ef4444', bgDark: 'rgba(127, 29, 29, 0.3)', textDark: '#fca5a5' },
    orange: { bg: 'rgba(255, 237, 213, 0.8)', text: '#9a3412', dot: '#f97316', bgDark: 'rgba(124, 45, 18, 0.3)', textDark: '#fdba74' },
    yellow: { bg: 'rgba(254, 249, 195, 0.8)', text: '#854d0e', dot: '#eab308', bgDark: 'rgba(113, 63, 18, 0.3)', textDark: '#fde047' },
    green: { bg: 'rgba(220, 252, 231, 0.8)', text: '#065f46', dot: '#10b981', bgDark: 'rgba(20, 83, 45, 0.3)', textDark: '#86efac' },
    blue: { bg: 'rgba(219, 234, 254, 0.8)', text: '#1e3a8a', dot: '#3b82f6', bgDark: 'rgba(30, 58, 138, 0.3)', textDark: '#93c5fd' },
    purple: { bg: 'rgba(243, 232, 255, 0.8)', text: '#6b21a8', dot: '#a855f7', bgDark: 'rgba(107, 33, 168, 0.3)', textDark: '#d8b4fe' },
    pink: { bg: 'rgba(252, 231, 243, 0.8)', text: '#9f1239', dot: '#ec4899', bgDark: 'rgba(159, 18, 57, 0.3)', textDark: '#f9a8d4' },
    gray: { bg: 'rgba(243, 244, 246, 0.8)', text: '#374151', dot: '#6b7280', bgDark: 'rgba(55, 65, 81, 0.3)', textDark: '#d1d5db' }
};

interface Student {
    id: string;
    name: string;
    teacher?: string;
    teacherName?: string;
    teacherEmail?: string;  // NEW: Store teacher's email
    subjects?: { English?: boolean; IT?: boolean };
    tag?: string;
}

const SHARED_COLLECTION_TEACHERS = ['romanvolkonidov@gmail.com', 'violetta6520@gmail.com'];

const TeacherStudentsPage: React.FC = () => {
    const { classes, cx } = useStyles();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [updatingTag, setUpdatingTag] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [isDark] = useState(true); // Always dark for Jitsi app
    const [teacherEmail, setTeacherEmail] = useState<string>('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentSubjects, setNewStudentSubjects] = useState({ English: false, IT: false });
    const [isAdding, setIsAdding] = useState(false);
    const origin = typeof window === 'undefined' ? 'https://online.rv2class.com' : window.location.origin;

    const isSharedCollection = SHARED_COLLECTION_TEACHERS.includes(teacherEmail);
    const collectionName = isSharedCollection ? 'students' : `students_${teacherEmail}`;

    useEffect(() => {
        // Get current teacher's email from Firebase Auth
        const initAuth = async () => {
            try {
                if (!window.firebaseApp || !window.firebaseAuth) {
                    console.error('Firebase not initialized');
                    return;
                }
                
                // With Firebase compat, auth is already initialized
                const auth = window.firebaseApp.auth();
                
                auth.onAuthStateChanged((user: any) => {
                    if (user && user.email) {
                        setTeacherEmail(user.email);
                    } else {
                        // No user logged in, set a default for testing
                        console.warn('No user logged in, using default email');
                        setTeacherEmail('teacher@rv2class.com');
                    }
                });
            } catch (error) {
                console.error('Auth initialization error:', error);
                // Fallback for development
                setTeacherEmail('teacher@rv2class.com');
            }
        };

        initAuth();
    }, []);

    useEffect(() => {
        if (teacherEmail) {
            loadStudents();
        }
    }, [teacherEmail]);

    const loadStudents = async () => {
        if (!teacherEmail) return;
        
        setLoading(true);
        try {
            const studentsRef = collection(db, collectionName);
            const querySnapshot = await getDocs(studentsRef);
            let studentsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Student[];
            
            // For non-shared collections, only show students added by this teacher
            if (!isSharedCollection) {
                studentsData = studentsData.filter(s => s.teacherEmail === teacherEmail);
            }
            
            // Sort by name
            studentsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setStudents(studentsData);
        } catch (error) {
            console.error('Error loading students:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateJoinLink = (student: Student) => {
        const tEmail = student.teacherEmail || teacherEmail;
        return `${origin}/static/student-welcome.html?studentId=${student.id}&teacherEmail=${encodeURIComponent(tEmail)}`;
    };

    const generateTagLink = (tagColor: string) => {
        return `${origin}/student/tag/${tagColor}`;
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const handleTagChange = async (studentId: string, newTag: string | null) => {
        setUpdatingTag(studentId);
        try {
            const studentRef = doc(db, collectionName, studentId);
            if (newTag === null) {
                await updateDoc(studentRef, {
                    tag: null
                });
            } else {
                await updateDoc(studentRef, {
                    tag: newTag
                });
            }
            await loadStudents();
        } catch (error) {
            console.error('Failed to update tag:', error);
        } finally {
            setUpdatingTag(null);
        }
    };

    const handleAddStudent = async () => {
        if (!newStudentName.trim()) {
            alert('Please enter a student name');
            return;
        }

        setIsAdding(true);
        try {
            const studentsRef = collection(db, collectionName);
            await addDoc(studentsRef, {
                name: newStudentName.trim(),
                teacherEmail: teacherEmail,
                subjects: newStudentSubjects,
                createdAt: serverTimestamp(),
                tag: null
            });

            // Reset form
            setNewStudentName('');
            setNewStudentSubjects({ English: false, IT: false });
            setShowAddForm(false);

            // Reload students
            await loadStudents();
        } catch (error) {
            console.error('Failed to add student:', error);
            alert('Failed to add student. Please try again.');
        } finally {
            setIsAdding(false);
        }
    };

    const toggleGroupExpanded = (color: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(color)) {
                newSet.delete(color);
            } else {
                newSet.add(color);
            }
            return newSet;
        });
    };

    const removeAllFromGroup = async (color: string) => {
        if (!window.confirm(`Remove all students from the ${color} group?`)) return;
        
        const studentsInGroup = students.filter(s => s.tag === color);
        setUpdatingTag('bulk-' + color);
        
        try {
            await Promise.all(
                studentsInGroup.map(student => {
                    const studentRef = doc(db, collectionName, student.id);
                    return updateDoc(studentRef, { tag: null });
                })
            );
            await loadStudents();
        } catch (error) {
            console.error('Failed to remove students from group:', error);
        } finally {
            setUpdatingTag(null);
        }
    };

    const getTeacherBadgeClass = (teacher?: string) => {
        if (teacher?.toLowerCase() === 'roman') {
            return isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(219, 234, 254, 0.8)';
        } else if (teacher?.toLowerCase() === 'violet') {
            return isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(243, 232, 255, 0.8)';
        }
        return isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.8)';
    };

    const studentsByTeacher = {
        Roman: students.filter(s => s.teacher?.toLowerCase() === 'roman'),
        Violet: students.filter(s => s.teacher?.toLowerCase() === 'violet'),
        Unassigned: students.filter(s => !s.teacher || s.teacher === 'unassigned')
    };

    const studentsByTag = Object.keys(TAG_COLORS).reduce((acc, color) => {
        const taggedStudents = students.filter(s => s.tag === color);
        if (taggedStudents.length > 0) {
            acc[color] = taggedStudents;
        }
        return acc;
    }, {} as Record<string, Student[]>);

    if (loading) {
        return (
            <div className={cx(classes.container, isDark && classes.containerDark)}>
                <div className={classes.loadingContainer}>
                    <div className={classes.spinner}></div>
                </div>
            </div>
        );
    }

    return (
        <div className={cx(classes.container, isDark && classes.containerDark)}>
            <div className={classes.maxWidth}>
                <div className={classes.header}>
                    <h1 className={cx(classes.title, isDark && classes.titleDark)}>
                        <span>👥</span>
                        <span>Students</span>
                    </h1>
                    <p className={cx(classes.subtitle, isDark && classes.subtitleDark)}>
                        {isSharedCollection 
                            ? 'All registered students with their personalized welcome pages'
                            : 'Your students with their personalized welcome pages'}
                    </p>
                    <div style={{ marginTop: '16px' }}>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className={classes.addButton}
                        >
                            <span>{showAddForm ? '✕' : '+'}</span>
                            <span>{showAddForm ? 'Cancel' : 'Add New Student'}</span>
                        </button>
                    </div>
                </div>

                {/* Add Student Form */}
                {showAddForm && (
                    <div className={classes.addFormContainer}>
                        <h3 style={{ color: '#10b981', marginBottom: '16px', fontSize: '1.25rem' }}>
                            Add New Student
                        </h3>
                        <div className={classes.formGroup}>
                            <label className={classes.label}>Student Name *</label>
                            <input
                                type="text"
                                value={newStudentName}
                                onChange={(e) => setNewStudentName(e.target.value)}
                                placeholder="Enter student name"
                                className={classes.input}
                            />
                        </div>
                        <div className={classes.formGroup}>
                            <label className={classes.label}>Subjects</label>
                            <div className={classes.checkboxGroup}>
                                <label className={classes.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={newStudentSubjects.English}
                                        onChange={(e) => setNewStudentSubjects({
                                            ...newStudentSubjects,
                                            English: e.target.checked
                                        })}
                                        className={classes.checkbox}
                                    />
                                    <span>English</span>
                                </label>
                                <label className={classes.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={newStudentSubjects.IT}
                                        onChange={(e) => setNewStudentSubjects({
                                            ...newStudentSubjects,
                                            IT: e.target.checked
                                        })}
                                        className={classes.checkbox}
                                    />
                                    <span>IT</span>
                                </label>
                            </div>
                        </div>
                        <div className={classes.formActions}>
                            <button
                                onClick={handleAddStudent}
                                disabled={isAdding}
                                className={cx(classes.button, classes.addButton)}
                                style={{ flex: 1 }}
                            >
                                {isAdding ? '⏳ Adding...' : '✓ Add Student'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewStudentName('');
                                    setNewStudentSubjects({ English: false, IT: false });
                                }}
                                className={cx(classes.button, classes.buttonOutline, classes.buttonOutlineDark)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {students.length === 0 ? (
                    <div className={cx(classes.card, isDark && classes.cardDark)}>
                        <div className={classes.emptyState}>
                            <div className={classes.emptyIcon}>👥</div>
                            <p className={cx(classes.emptyText, isDark && classes.emptyTextDark)}>
                                No students found. Add students via Student Management.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className={classes.sectionSpace}>
                        {/* Color Groups */}
                        {Object.keys(studentsByTag).length > 0 && (
                            <div className={cx(classes.card, isDark && classes.cardDark)} style={{ border: '2px solid #3b82f6' }}>
                                <div className={classes.cardHeader}>
                                    <h2 className={cx(classes.cardTitle, isDark && classes.cardTitleDark)}>
                                        <span>🏷️</span>
                                        <span>Color Groups</span>
                                    </h2>
                                    <p className={cx(classes.cardDescription, isDark && classes.cardDescriptionDark)}>
                                        Click on a group to expand and see all students. You can remove students or delete entire groups.
                                    </p>
                                </div>
                                <div>
                                    {Object.entries(studentsByTag).map(([color, tagStudents]) => {
                                        const tagLink = generateTagLink(color);
                                        const colorScheme = TAG_COLORS[color as keyof typeof TAG_COLORS];
                                        const isCopied = copiedId === `tag-${color}`;
                                        const isExpanded = expandedGroups.has(color);
                                        const isRemoving = updatingTag === 'bulk-' + color;

                                        return (
                                            <div 
                                                key={color}
                                                className={cx(classes.groupCard, isDark && classes.groupCardDark)}
                                                style={{ 
                                                    background: isDark ? colorScheme.bgDark : colorScheme.bg
                                                }}
                                            >
                                                <div className={classes.groupHeader}>
                                                    <button
                                                        onClick={() => toggleGroupExpanded(color)}
                                                        className={classes.groupHeaderButton}
                                                    >
                                                        <span>{isExpanded ? '▼' : '▶'}</span>
                                                        <div 
                                                            className={classes.colorDot}
                                                            style={{ background: colorScheme.dot }}
                                                        ></div>
                                                        <span 
                                                            className={classes.groupTitle}
                                                            style={{ color: isDark ? colorScheme.textDark : colorScheme.text }}
                                                        >
                                                            {color} Group
                                                        </span>
                                                        <span className={cx(classes.groupCount, isDark && classes.groupCountDark)}>
                                                            ({tagStudents.length} {tagStudents.length === 1 ? 'student' : 'students'})
                                                        </span>
                                                    </button>

                                                    <div className={classes.buttonGroup}>
                                                        <button
                                                            onClick={() => copyToClipboard(tagLink, `tag-${color}`)}
                                                            className={cx(classes.button, classes.buttonOutline, isDark && classes.buttonOutlineDark)}
                                                            title="Copy group link"
                                                        >
                                                            <span>{isCopied ? '✓' : '📋'}</span>
                                                            <span style={{ display: window.innerWidth < 640 ? 'none' : 'inline' }}>Link</span>
                                                        </button>
                                                        <button
                                                            onClick={() => window.open(tagLink, '_blank')}
                                                            className={cx(classes.button, classes.buttonOutline, isDark && classes.buttonOutlineDark)}
                                                            title="Open group page"
                                                        >
                                                            <span>↗</span>
                                                            <span style={{ display: window.innerWidth < 640 ? 'none' : 'inline' }}>Open</span>
                                                        </button>
                                                        <button
                                                            onClick={() => removeAllFromGroup(color)}
                                                            disabled={isRemoving}
                                                            className={cx(classes.button, classes.buttonDestructive)}
                                                            title="Remove all students from group"
                                                        >
                                                            {isRemoving ? '⏳' : '✕'}
                                                            <span style={{ display: window.innerWidth < 640 ? 'none' : 'inline' }}>Delete Group</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className={classes.expandedStudents}>
                                                        {tagStudents.map(student => {
                                                            const isUpdating = updatingTag === student.id;

                                                            return (
                                                                <div
                                                                    key={student.id}
                                                                    className={cx(classes.studentCard, isDark && classes.studentCardDark)}
                                                                >
                                                                    <div className={classes.studentInfo}>
                                                                        <h4 className={cx(classes.studentName, isDark && classes.studentNameDark)}>
                                                                            {student.name}
                                                                        </h4>
                                                                        {student.teacher && (
                                                                            <span 
                                                                                className={classes.teacherBadge}
                                                                                style={{ 
                                                                                    background: getTeacherBadgeClass(student.teacher),
                                                                                    color: isDark ? '#d1d5db' : '#374151'
                                                                                }}
                                                                            >
                                                                                {student.teacher}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleTagChange(student.id, null)}
                                                                        disabled={isUpdating}
                                                                        className={cx(classes.button, classes.buttonOutline, isDark && classes.buttonOutlineDark)}
                                                                        title="Remove from group"
                                                                        style={{ color: '#ef4444' }}
                                                                    >
                                                                        {isUpdating ? '⏳' : '🚫'}
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Individual Students by Teacher */}
                        {Object.entries(studentsByTeacher).map(([teacher, studentList]) => {
                            if (studentList.length === 0) return null;

                            return (
                                <div key={teacher} className={cx(classes.card, isDark && classes.cardDark)}>
                                    <div className={classes.cardHeader}>
                                        <h2 className={cx(classes.cardTitle, isDark && classes.cardTitleDark)}>
                                            <span>
                                                {teacher === 'Roman' ? '👨‍🏫' : teacher === 'Violet' ? '👩‍🏫' : '📋'}
                                            </span>
                                            <span>
                                                {teacher === 'Unassigned' ? 'Unassigned Students' : `${teacher}'s Students`}
                                            </span>
                                        </h2>
                                        <p className={cx(classes.cardDescription, isDark && classes.cardDescriptionDark)}>
                                            {studentList.length} {studentList.length === 1 ? 'student' : 'students'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {studentList.map(student => {
                                            const joinLink = generateJoinLink(student);
                                            const isCopied = copiedId === student.id;

                                            return (
                                                <div
                                                    key={student.id}
                                                    className={cx(classes.individualCard, isDark && classes.individualCardDark)}
                                                >
                                                    <div className={classes.studentDetails}>
                                                        <div className={classes.studentHeader}>
                                                            <h3 className={cx(classes.studentNameLarge, isDark && classes.studentNameLargeDark)}>
                                                                {student.name}
                                                            </h3>
                                                            {student.tag && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <div
                                                                        style={{
                                                                            width: '8px',
                                                                            height: '8px',
                                                                            borderRadius: '50%',
                                                                            background: TAG_COLORS[student.tag as keyof typeof TAG_COLORS].dot
                                                                        }}
                                                                    ></div>
                                                                    <span
                                                                        className={classes.teacherBadge}
                                                                        style={{
                                                                            background: isDark 
                                                                                ? TAG_COLORS[student.tag as keyof typeof TAG_COLORS].bgDark
                                                                                : TAG_COLORS[student.tag as keyof typeof TAG_COLORS].bg,
                                                                            color: isDark
                                                                                ? TAG_COLORS[student.tag as keyof typeof TAG_COLORS].textDark
                                                                                : TAG_COLORS[student.tag as keyof typeof TAG_COLORS].text
                                                                        }}
                                                                    >
                                                                        {student.tag}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {student.teacher && (
                                                                <span
                                                                    className={classes.teacherBadge}
                                                                    style={{
                                                                        background: getTeacherBadgeClass(student.teacher),
                                                                        color: isDark ? '#d1d5db' : '#374151'
                                                                    }}
                                                                >
                                                                    {student.teacher}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={cx(classes.linkInfo, isDark && classes.linkInfoDark)}>
                                                            <span>🔗</span>
                                                            <span>Personal page:</span>
                                                            <code className={cx(classes.linkCode, isDark && classes.linkCodeDark)}>
                                                                {joinLink}
                                                            </code>
                                                        </div>
                                                        {student.subjects && (
                                                            <div className={classes.subjectBadges}>
                                                                {student.subjects.English && (
                                                                    <span
                                                                        className={classes.subjectBadge}
                                                                        style={{
                                                                            background: isDark ? 'rgba(20, 83, 45, 0.3)' : 'rgba(220, 252, 231, 0.8)',
                                                                            color: isDark ? '#86efac' : '#065f46'
                                                                        }}
                                                                    >
                                                                        English
                                                                    </span>
                                                                )}
                                                                {student.subjects.IT && (
                                                                    <span
                                                                        className={classes.subjectBadge}
                                                                        style={{
                                                                            background: isDark ? 'rgba(30, 58, 138, 0.3)' : 'rgba(219, 234, 254, 0.8)',
                                                                            color: isDark ? '#93c5fd' : '#1e3a8a'
                                                                        }}
                                                                    >
                                                                        IT
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className={classes.tagSelector}>
                                                            <label className={cx(classes.tagLabel, isDark && classes.tagLabelDark)}>
                                                                Color Tag:
                                                            </label>
                                                            <div className={classes.tagDots}>
                                                                {Object.entries(TAG_COLORS).map(([color, colorScheme]) => (
                                                                    <button
                                                                        key={color}
                                                                        onClick={() => handleTagChange(student.id, student.tag === color ? null : color)}
                                                                        disabled={updatingTag === student.id}
                                                                        className={cx(
                                                                            classes.tagDot,
                                                                            student.tag === color 
                                                                                ? (isDark ? classes.tagDotActiveDark : classes.tagDotActive)
                                                                                : (isDark ? classes.tagDotInactiveDark : classes.tagDotInactive)
                                                                        )}
                                                                        style={{
                                                                            background: colorScheme.dot,
                                                                            opacity: updatingTag === student.id ? 0.5 : 1
                                                                        }}
                                                                        title={color}
                                                                    />
                                                                ))}
                                                                {student.tag && (
                                                                    <button
                                                                        onClick={() => handleTagChange(student.id, null)}
                                                                        disabled={updatingTag === student.id}
                                                                        className={cx(classes.removeTagButton, isDark && classes.removeTagButtonDark)}
                                                                        title="Remove tag"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={classes.actions}>
                                                        <button
                                                            onClick={() => copyToClipboard(joinLink, student.id)}
                                                            className={cx(classes.button, classes.buttonOutline, isDark && classes.buttonOutlineDark)}
                                                        >
                                                            {isCopied ? (
                                                                <>
                                                                    <span>✓</span>
                                                                    <span>Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>📋</span>
                                                                    <span>Copy Link</span>
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => window.open(joinLink, '_blank')}
                                                            className={cx(classes.button, classes.buttonOutline, isDark && classes.buttonOutlineDark)}
                                                            style={{ background: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff' }}
                                                        >
                                                            <span>↗</span>
                                                            <span>Open</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className={classes.footer}>
                    <button
                        onClick={() => window.history.back()}
                        className={cx(classes.button, classes.buttonOutline, isDark && classes.buttonOutlineDark)}
                    >
                        Back to Home
                    </button>
                    <button
                        onClick={loadStudents}
                        className={cx(classes.button, classes.buttonOutline, isDark && classes.buttonOutlineDark)}
                    >
                        Refresh
                    </button>
                </div>

                <div className={cx(classes.footerText, isDark && classes.footerTextDark)}>
                    <p>Students can click their personalized link to join with their name pre-filled</p>
                </div>
            </div>
        </div>
    );
};

export default TeacherStudentsPage;
