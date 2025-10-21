import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
