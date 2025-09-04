import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDQnrbvsx52ikiWELf6hc4YiXQTC1G5tpY",
  authDomain: "three-sided-flashcard-app.firebaseapp.com",
  projectId: "three-sided-flashcard-app",
  storageBucket: "three-sided-flashcard-app.firebasestorage.app",
  messagingSenderId: "47503676879",
  appId: "1:47503676879:web:27fb875159cc4459a12eba",
  measurementId: "G-PBP1G21Q29"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);

export default app;
