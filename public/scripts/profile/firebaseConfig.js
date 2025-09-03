function initializeFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyBU6LsdsoOTl6stATDTyeG4hmRohN9C9h0",
    authDomain: "three-sided-flashcard-app.firebaseapp.com",
    projectId: "three-sided-flashcard-app",
  };

  firebase.initializeApp(firebaseConfig);
  
  const auth = firebase.auth();
  const db = firebase.firestore();

  return { firebase, auth, db };
}