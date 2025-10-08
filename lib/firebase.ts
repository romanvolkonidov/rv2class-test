import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, getDoc, query, where, addDoc, updateDoc, doc, serverTimestamp, deleteField, Timestamp } from "firebase/firestore";

// Helper to convert Firebase Timestamps to plain objects
const serializeTimestamp = (value: any): any => {
  if (value instanceof Timestamp) {
    return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value && typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
    return { seconds: Math.floor(value.toDate().getTime() / 1000), nanoseconds: 0 };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeTimestamp(v)])
    );
  }
  if (Array.isArray(value)) {
    return value.map(serializeTimestamp);
  }
  return value;
};

const firebaseConfig = {
  apiKey: "AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004",
  authDomain: "tracking-budget-app.firebaseapp.com",
  databaseURL: "https://tracking-budget-app-default-rtdb.firebaseio.com",
  projectId: "tracking-budget-app",
  storageBucket: "tracking-budget-app.appspot.com",
  messagingSenderId: "912992088190",
  appId: "1:912992088190:web:926c8826b3bc39e2eb282f"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Student interface
export interface Student {
  id: string;
  name: string;
  teacher?: string;
  subjects?: { English?: boolean; IT?: boolean };
  price?: number;
  currency?: string;
  tag?: "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "gray";
}

// Topic interface
export interface Topic {
  id: string;
  name: string;
  sentence?: string; // Base sentence for fill-in-blank questions
  text?: string; // Alternative field for topic content
  description?: string;
  courseId?: string;
  chapterId?: string;
  order?: number;
}

// Homework Assignment interface
export interface HomeworkAssignment {
  id: string;
  studentId: string;
  topicId: string;
  topicIds: string[];
  courseId: string;
  chapterId: string;
  assignedAt: any;
  status?: string;
  courseName?: string;
  chapterName?: string;
  topicName?: string;
  // Homework-level media (shown above all questions)
  homeworkMediaFiles?: Array<{
    filename: string;
    url: string;
    type: string;
  }>;
}

// Homework Report interface
export interface HomeworkReport {
  id: string;
  studentId: string;
  homeworkId: string;
  score?: number;
  completedAt?: any;
  submittedAnswers?: any;
  correctAnswers?: number;
  totalQuestions?: number;
}

// Question interface
export interface Question {
  id: string;
  topicId: string;
  text: string; // For fill-in-blank: blank number ("1", "2", "3"); For others: full question text
  sentence?: string; // Base sentence from topic (injected client-side)
  question?: string; // Fallback
  options?: string[];
  correctAnswer: string | number; // Can be string or index number
  type?: string; // 'textAnswer', 'multipleChoice', 'fillInBlank', etc.
  mediaUrl?: string;
  mediaType?: string; // 'image', 'audio', 'video'
  mediaFiles?: Array<{
    filename: string;
    url: string;
    type: string;
  }>;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  explanation?: string;
  order?: number;
  createdAt?: string;
}

// Fetch all students from Firestore
export const fetchStudents = async (): Promise<Student[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "students"));
    const students = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];
    return students.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
};

// Update student tag
export const updateStudentTag = async (studentId: string, tag: string | null): Promise<boolean> => {
  try {
    const studentRef = doc(db, "students", studentId);
    if (tag === null) {
      await updateDoc(studentRef, {
        tag: deleteField()
      });
    } else {
      await updateDoc(studentRef, {
        tag: tag
      });
    }
    return true;
  } catch (error) {
    console.error("Error updating student tag:", error);
    return false;
  }
};

// Fetch a single topic by ID
export const fetchTopic = async (topicId: string): Promise<Topic | null> => {
  try {
    const topicRef = doc(db, "telegramTopics", topicId);
    const topicSnap = await getDoc(topicRef);
    
    if (topicSnap.exists()) {
      return {
        id: topicSnap.id,
        ...topicSnap.data()
      } as Topic;
    }
    return null;
  } catch (error) {
    console.error("Error fetching topic:", error);
    return null;
  }
};

// Fetch homework assignments for a specific student (Telegram only)
export const fetchStudentHomework = async (studentId: string): Promise<HomeworkAssignment[]> => {
  try {
    // Only fetch from telegramAssignments (the main Telegram homework collection)
    const assignmentsRef = collection(db, "telegramAssignments");
    const q = query(assignmentsRef, where("studentId", "==", studentId));
    const querySnapshot = await getDocs(q);
    
    const assignments = querySnapshot.docs.map(doc => {
      const data = serializeTimestamp(doc.data());
      return {
        id: doc.id,
        ...data
      };
    }) as HomeworkAssignment[];
    
    return assignments;
  } catch (error) {
    console.error("Error fetching homework assignments:", error);
    return [];
  }
};

// Fetch homework reports for a specific student (Telegram only)
export const fetchHomeworkReports = async (studentId: string): Promise<HomeworkReport[]> => {
  try {
    const reportsRef = collection(db, "telegramHomeworkReports");
    const q = query(reportsRef, where("studentId", "==", studentId));
    const querySnapshot = await getDocs(q);
    
    const reports = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...serializeTimestamp(doc.data())
    })) as HomeworkReport[];
    
    return reports;
  } catch (error) {
    console.error("Error fetching homework reports:", error);
    return [];
  }
};

// Fetch ALL homework assignments (for debugging - Telegram only)
export const fetchAllHomework = async (): Promise<HomeworkAssignment[]> => {
  try {
    const assignmentsRef = collection(db, "telegramAssignments");
    const querySnapshot = await getDocs(assignmentsRef);
    
    const assignments = querySnapshot.docs.map(doc => {
      const data = serializeTimestamp(doc.data());
      return {
        id: doc.id,
        ...data
      };
    }) as HomeworkAssignment[];
    
    return assignments;
  } catch (error) {
    console.error("Error fetching all homework assignments:", error);
    return [];
  }
};

// Fetch questions for a homework assignment by topicIds
export const fetchQuestionsForHomework = async (topicIds: string[]): Promise<Question[]> => {
  try {
    if (!topicIds || topicIds.length === 0) {
      return [];
    }

    // Fetch from telegramQuestions collection
    const questionsRef = collection(db, "telegramQuestions");
    const allQuestions: Question[] = [];
    
    // Fetch questions for each topic
    for (const topicId of topicIds) {
      const q = query(questionsRef, where("topicId", "==", topicId));
      const querySnapshot = await getDocs(q);
      
      const topicQuestions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Question[];
      
      allQuestions.push(...topicQuestions);
    }
    
    // Sort by order field to maintain the correct sequence
    allQuestions.sort((a, b) => {
      const orderA = a.order ?? 999999;
      const orderB = b.order ?? 999999;
      return orderA - orderB;
    });
    
    return allQuestions;
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
};

// Submit homework answers and calculate score
export const submitHomeworkAnswers = async (
  assignmentId: string,
  studentId: string,
  answers: { questionId: string; answer: string }[],
  questions: Question[]
): Promise<{ success: boolean; score: number; correctAnswers: number; totalQuestions: number }> => {
  try {
    // Calculate score
    let correctCount = 0;
    const totalCount = questions.length;
    
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question && question.correctAnswer === answer.answer) {
        correctCount++;
      }
    });
    
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    
    // Update assignment status
    const assignmentRef = doc(db, "telegramAssignments", assignmentId);
    await updateDoc(assignmentRef, {
      status: "completed",
      completedAt: serverTimestamp()
    });

    // Create homework report
    const reportData = {
      studentId,
      homeworkId: assignmentId,
      score,
      correctAnswers: correctCount,
      totalQuestions: totalCount,
      submittedAnswers: answers,
      completedAt: serverTimestamp(),
      completedVia: "web-app"
    };

    await addDoc(collection(db, "telegramHomeworkReports"), reportData);
    
    console.log(`Homework submitted: ${correctCount}/${totalCount} correct (${score}%)`);
    
    return {
      success: true,
      score,
      correctAnswers: correctCount,
      totalQuestions: totalCount
    };
  } catch (error) {
    console.error("Error submitting homework:", error);
    return {
      success: false,
      score: 0,
      correctAnswers: 0,
      totalQuestions: 0
    };
  }
};

// Mark homework as complete (legacy function - kept for compatibility)
export const completeHomework = async (
  assignmentId: string,
  studentId: string,
  score: number = 100
): Promise<boolean> => {
  try {
    // Update the assignment status
    const assignmentRef = doc(db, "telegramAssignments", assignmentId);
    await updateDoc(assignmentRef, {
      status: "completed",
      completedAt: serverTimestamp()
    });

    // Create a completion report
    const reportData = {
      studentId,
      homeworkId: assignmentId,
      score,
      completedAt: serverTimestamp(),
      completedVia: "web-app"
    };

    await addDoc(collection(db, "telegramHomeworkReports"), reportData);
    
    console.log("Homework marked as complete:", assignmentId);
    return true;
  } catch (error) {
    console.error("Error completing homework:", error);
    return false;
  }
};

// Chat Message interface
export interface ChatMessage {
  id?: string;
  roomName: string; // Tutor's room
  from: string; // Sender's identity (name)
  message: string;
  timestamp: number;
  createdAt?: any; // Firestore timestamp
}

// Save a chat message to Firebase
export const saveChatMessage = async (
  roomName: string,
  from: string,
  message: string,
  timestamp: number
): Promise<void> => {
  try {
    const chatData: ChatMessage = {
      roomName,
      from,
      message,
      timestamp,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "chatMessages"), chatData);
    console.log("💬 Chat message saved to Firebase:", { roomName, from });
  } catch (error) {
    console.error("❌ Error saving chat message:", error);
    throw error;
  }
};

// Load chat history for a room
export const loadChatHistory = async (roomName: string): Promise<ChatMessage[]> => {
  try {
    const q = query(
      collection(db, "chatMessages"),
      where("roomName", "==", roomName)
    );
    
    const snapshot = await getDocs(q);
    const messages: ChatMessage[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        roomName: data.roomName,
        from: data.from,
        message: data.message,
        timestamp: data.timestamp,
        createdAt: data.createdAt
      });
    });

    // Sort by timestamp (oldest first)
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`💬 Loaded ${messages.length} chat messages for room: ${roomName}`);
    return messages;
  } catch (error) {
    console.error("❌ Error loading chat history:", error);
    return [];
  }
};

export { app, auth, db };
