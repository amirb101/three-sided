function createProfileAuthService(firebase, auth, db) {
  let currentUser = null;

  function onAuthChange(callback) {
    auth.onAuthStateChanged(user => {
      currentUser = user;
      callback(user);
    });
  }

  function getCurrentUser() {
    return currentUser;
  }

  function logout() {
    return auth.signOut();
  }

  return {
    auth,
    onAuthChange,
    getCurrentUser,
    logout
  };
}