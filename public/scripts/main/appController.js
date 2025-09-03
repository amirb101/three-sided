// Main application controller - handles initialization and global state
function createAppController(dependencies) {
  const { 
    firebase, 
    db, 
    auth, 
    analytics, 
    authService, 
    flashcardService, 
    cacheService, 
    subscriptionService, 
    flashcardController,
    uiRenderer 
  } = dependencies;

  let flashcards = [];
  let userId = null;
  let editIndex = -1;
  let isPremium = false;
  let pageStartTime = Date.now();

  const welcomeCard = {
    statement: `👋 Welcome to Three-Sided!

This is your first flashcard.

Click anywhere on the card to flip it and reveal hints and a full proof.`,
    hints: `⚠️ Every card has:
- A **statement** (what you're asked)
- **Hints** (to jog your memory)
- A **proof** (full working)

Click again to flip back.`,
    proof: `🧠 Tips:
- Use the "View All Flashcards" button to see or edit everything.
- Use "Spaced Repetition Mode" for real learning gains.
- You can **filter** by tags like "group theory" or "Fourier".

💡 Cards with no tags can be filtered using the "Untagged" option.`,
    tags: ["welcome", "onboarding"]
  };

  // Initialize analytics tracking
  function initializeAnalytics() {
    analytics.logEvent('page_view', {
      page_location: window.location.href,
      page_title: document.title
    });

    const lastVisit = localStorage.getItem("last_visit");
    if (!lastVisit) {
      analytics.logEvent("first_visit");
    } else {
      const days = Math.floor((pageStartTime - parseInt(lastVisit)) / (1000 * 60 * 60 * 24));
      analytics.logEvent("return_visit_after_days", { days });
    }
    localStorage.setItem("last_visit", pageStartTime.toString());

    // Track page duration on exit
    window.addEventListener("beforeunload", () => {
      const durationMs = Date.now() - pageStartTime;
      analytics.logEvent("page_duration", {
        duration_seconds: Math.round(durationMs / 1000),
        page_title: document.title,
        user_id: userId || "guest"
      });
    });
  }

  // Handle authentication state changes
  async function handleAuthChange(user) {
    const summary = document.getElementById("authSummary");
    const details = document.getElementById("authDetails");
    const profileBtnWrapper = document.getElementById("profileBtnWrapper");
    const profileBtn = document.getElementById("profileBtn");

    if (user && !user.emailVerified) {
      alert("Please verify your email address first.");
      authService.logout();
      return;
    }

    userId = user ? user.uid : null;
    flashcardController.setUserId(userId);

    if (userId) {
      summary.innerText = `Signed in as ${user.email} (click to switch account)`;
      summary.style.display = "inline-block";
      details.style.display = "none";

      // --- Login streak tracking ---
      try {
        const functions = firebase.app().functions('us-central1');
        const updateLoginStreak = functions.httpsCallable('updateLoginStreak');
        await updateLoginStreak();
      } catch (err) {
        console.warn('Failed to update login streak:', err);
      }
      // --- End login streak tracking ---

      const userRef = db.collection("users").doc(userId);
      const doc = await userRef.get();

      if (!doc.exists) {
        await userRef.set({
          isPremium: false,
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      isPremium = doc.exists && doc.data().isPremium === true;
      console.log("Premium status:", isPremium);

      await flashcardController.loadCards();

      try {
        const slugDoc = await db.collection("userToSlug").doc(user.uid).get();
        profileBtnWrapper.style.display = "block";
        profileBtn.onclick = () => {
          if (slugDoc.exists) {
            const slug = slugDoc.data().slug;
            window.location.href = `/profile/${slug}`;
          } else {
            window.location.href = "/create-profile.html";
          }
        };
      } catch (err) {
        console.error("Error fetching slug:", err);
        profileBtnWrapper.style.display = "none";
      }

      analytics.logEvent("session_start_custom", {
        user_id: userId
      });
    } else {
      summary.style.display = "none";
      details.style.display = "inline-block";
      userId = null;
      profileBtnWrapper.style.display = "none";
      flashcardController.setGuestMode(welcomeCard);
    }
  }

  // Initialize the application
  function initialize() {
    initializeAnalytics();
    authService.onAuthChange(handleAuthChange);
  }

  // Getters for state
  function getFlashcards() { return flashcards; }
  function getUserId() { return userId; }
  function getEditIndex() { return editIndex; }
  function getIsPremium() { return isPremium; }

  // Setters for state
  function setFlashcards(cards) { flashcards = cards; }
  function setEditIndex(index) { editIndex = index; }

  return {
    initialize,
    handleAuthChange,
    getFlashcards,
    getUserId,
    getEditIndex,
    getIsPremium,
    setFlashcards,
    setEditIndex,
    welcomeCard
  };
}