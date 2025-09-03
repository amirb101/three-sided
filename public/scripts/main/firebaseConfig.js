// Firebase configuration and initialization
function initializeFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyBU6LsdsoOTl6stATDTyeG4hmRohN9C9h0",
    authDomain: "three-sided-flashcard-app.firebaseapp.com",
    projectId: "three-sided-flashcard-app",
    storageBucket: "three-sided-flashcard-app.firebasestorage.app",
    messagingSenderId: "47503676879",
    appId: "1:47503676879:web:27fb875159cc4459a12eba",
    measurementId: "G-PBP1G21Q29"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Get Firebase services
  const auth = firebase.auth();
  const db = firebase.firestore();
  const analytics = (firebase.analytics && typeof firebase.analytics === 'function') ? firebase.analytics() : null;

  return { firebase, auth, db, analytics };
}