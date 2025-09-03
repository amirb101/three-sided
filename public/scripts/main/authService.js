function createAuthService(firebase, db, analytics) {
  const auth = firebase.auth();

  async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      const userRef = db.collection("users").doc(user.uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        await userRef.set({
          isPremium: false,
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      console.log("Signed in with Google:", user.email);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      alert("Sign-in failed.");
    }
  }

  // Optional: enable later if you support email login/signup
  /*
  function login(email, password) {
    return auth.signInWithEmailAndPassword(email, password)
      .then(() => analytics.logEvent('login_success'))
      .catch(err => {
        analytics.logEvent('login_error', { message: err.message });
        alert(err.message);
      });
  }

  function signup(email, password) {
    return auth.createUserWithEmailAndPassword(email, password)
      .then(async (cred) => {
        const token = await cred.user.getIdToken(true);
        console.log("User token:", token);

        await db.collection("users").doc(cred.user.uid).set({
          userId: cred.user.uid,
          isPremium: false,
          email: cred.user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await cred.user.sendEmailVerification({
          url: 'https://three-sided-flashcard-app.web.app'
        });

        alert("Verification email sent.");
      })
      .catch(err => {
        console.error("Signup error:", err);
        alert(err.message);
      });
  }

  function resetPassword(emailAddress) {
    return auth.sendPasswordResetEmail(emailAddress)
      .then(() => alert("Password reset link sent!"))
      .catch(err => alert(err.message));
  }
  */

  function logout() {
    return auth.signOut();
  }

  function onAuthChange(callback) {
    auth.onAuthStateChanged(callback);
  }

  return {
    auth,
    signInWithGoogle,
    logout,
    onAuthChange,
    // login,
    // signup,
    // resetPassword
  };
}
