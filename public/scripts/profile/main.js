document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase
  const { firebase, auth, db } = initializeFirebase();

  // Create services
  const authService = createProfileAuthService(firebase, auth, db);
  const profileService = createProfileService(firebase, db);
  const friendService = createFriendService(firebase, db);
  const publicCardService = createPublicCardService(firebase, db);

  const services = {
    authService,
    profileService,
    friendService,
    publicCardService
  };

  // Create controller
  const profileController = createProfileController(services, profileRenderer);

  // Setup event handlers
  setupProfileEventHandlers(profileController);

  // Handle sort dropdown
  const sortSelect = document.getElementById('profileSort');
  if (sortSelect && window.profileController) {
    sortSelect.addEventListener('change', (e) => {
      profileController.changeSort(e.target.value);
    });
  }

  // Handle auth state changes
  authService.onAuthChange((user) => {
    // Load profile when auth state is determined
    // user === undefined means still loading
    // user === null means logged out
    // user === object means logged in
    if (user !== undefined) {
      profileController.loadProfile();
    }
  });

  // Handle page visibility change to refresh data when returning to tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && profileController) {
      // Optionally refresh profile when tab becomes visible
      // profileController.loadProfile();
    }
  });

  // Handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    if (profileController) {
      profileController.loadProfile();
    }
  });
});