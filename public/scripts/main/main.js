// Main application entry point
(function() {
  // Initialize Firebase
  const { firebase, auth, db, analytics } = initializeFirebase();

  // Create service instances
  const authService = createAuthService(firebase, db, analytics);
  const flashcardService = createFlashcardService(firebase, db);
  const cacheService = createCacheService();
  const subscriptionService = createSubscriptionService(auth, analytics);

  // Create flashcard controller
  const flashcardController = createFlashcardController({
    flashcardService,
    cacheService,
    uiRenderer,
    analytics,
    db,
    setFlashcards: (cards) => { 
      appController.setFlashcards(cards); 
    }
  });

  uiRenderer.setFlashcardController(flashcardController)

  // Create app controller
  const appController = createAppController({
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
  });

  // Create event handlers
  const eventHandlers = createEventHandlers({
    flashcardController,
    uiRenderer,
    authService,
    subscriptionService,
    analytics,
    auth,
    appController
  });

  // Create AI handlers
  const aiHandlers = createAIHandlers({
    auth,
    analytics,
    uiRenderer,
    createDeepSeekService
  });

  // Attach global event handlers to window for HTML onclick attributes
  window.flip = eventHandlers.flip;
  window.prevCard = eventHandlers.prevCard;
  window.nextCard = eventHandlers.nextCard;
  window.restartDeck = eventHandlers.restartDeck;
  window.applyTagFilter = eventHandlers.applyTagFilter;
  window.handleToggleFilter = eventHandlers.handleToggleFilter;
  window.handleToggleListPopup = eventHandlers.handleToggleListPopup;
  window.handleCloseListPopup = eventHandlers.handleCloseListPopup;
  window.editFlashcard = eventHandlers.editFlashcard;
  window.closeEditPopup = eventHandlers.closeEditPopup;
  window.saveEdit = eventHandlers.saveEdit;
  window.addCard = eventHandlers.addCard;
  window.signInWithGoogle = eventHandlers.signInWithGoogle;
  window.logout = eventHandlers.logout;
  window.toggleAuthDetails = eventHandlers.toggleAuthDetails;
  window.startSubscription = eventHandlers.startSubscription;
  window.openBillingPortal = eventHandlers.openBillingPortal;
  
  // AI handlers
  window.autoFillFromStatement = aiHandlers.autoFillFromStatement;
  window.autoTagOnly = aiHandlers.autoTagOnly;
  window.convertToLatex = aiHandlers.convertToLatex;

  // Initialize the application
  appController.initialize();

  // --- Leaderboard Fetch & Render ---
  async function fetchAndRenderLeaderboard(sort = "upvotes") {
    const table = document.getElementById('leaderboardTable').getElementsByTagName('tbody')[0];
    try {
      const res = await fetch(
        `https://us-central1-three-sided-flashcard-app.cloudfunctions.net/getLeaderboard?sort=${encodeURIComponent(sort)}`
      );
      const data = await res.json();
      if (!data.leaderboard || !Array.isArray(data.leaderboard)) throw new Error('No leaderboard data');
      if (data.leaderboard.length === 0) {
        table.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#a0aec0;">No leaderboard data yet.</td></tr>';
        return;
      }
      table.innerHTML = data.leaderboard.map((entry, i) => `
        <tr>
          <td style="text-align:center; font-weight:600; color:#667eea;">${i + 1}</td>
          <td style="text-align:left;">
            <a href="/profile/${encodeURIComponent(entry.slug)}" style="color:#2d3748; font-weight:600; text-decoration:none;">
              ${entry.displayName}
            </a>
          </td>
          <td style="text-align:center; color:#e53e3e; font-weight:600;">${entry.upvotesReceived}</td>
          <td style="text-align:center; color:#3182ce;">${entry.flashcardCount}</td>
          <td style="text-align:center; color:#d69e2e; font-weight:600;">${entry.loginStreak}</td>
        </tr>
      `).join('');
    } catch (err) {
      table.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#e53e3e;">Failed to load leaderboard.</td></tr>';
      console.error('Leaderboard error:', err);
    }
  }

  // Add event listener for sort dropdown
  const sortSelect = document.getElementById('leaderboardSort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      fetchAndRenderLeaderboard(e.target.value);
    });
  }

  // Initial load
  fetchAndRenderLeaderboard();

  // --- Tag Management System ---
  let allExistingTags = new Set();

  // Load existing tags from user's flashcards
  async function loadExistingTags() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const snapshot = await db.collection("flashcards")
        .where("userId", "==", user.uid)
        .get();

      const tags = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.tags && Array.isArray(data.tags)) {
          data.tags.forEach(tag => tags.add(tag.trim()));
        }
      });

      allExistingTags = tags;
      renderExistingTags();
    } catch (error) {
      console.error('Error loading existing tags:', error);
    }
  }

  // Render existing tags as clickable buttons
  function renderExistingTags() {
    const container = document.getElementById('existingTagsList');
    if (!container) return;

    if (allExistingTags.size === 0) {
      container.innerHTML = '<div style="color: #a0aec0; font-style: italic;">No existing tags found. Create your first card to see tags here!</div>';
      return;
    }

    const sortedTags = Array.from(allExistingTags).sort();
    container.innerHTML = sortedTags.map(tag => `
      <button 
        class="existing-tag-btn" 
        onclick="addExistingTag('${tag.replace(/'/g, "\\'")}')"
        style="
          background: #e2e8f0; 
          color: #4a5568; 
          border: none; 
          padding: 0.25rem 0.75rem; 
          border-radius: 20px; 
          font-size: 0.85rem; 
          cursor: pointer; 
          transition: all 0.2s;
          white-space: nowrap;
        "
        onmouseover="this.style.background='#cbd5e0'; this.style.color='#2d3748';"
        onmouseout="this.style.background='#e2e8f0'; this.style.color='#4a5568';"
      >
        ${tag}
      </button>
    `).join('');
  }

  // Add existing tag to the input
  window.addExistingTag = function(tag) {
    const textarea = document.getElementById('newTags');
    if (!textarea) return;

    const currentValue = textarea.value.trim();
    const currentTags = currentValue ? currentValue.split(',').map(t => t.trim()) : [];
    
    // Don't add if already present
    if (currentTags.includes(tag)) {
      // Visual feedback that tag is already added
      const btn = event.target;
      btn.style.background = '#48bb78';
      btn.style.color = 'white';
      setTimeout(() => {
        btn.style.background = '#e2e8f0';
        btn.style.color = '#4a5568';
      }, 500);
      return;
    }

    // Add the tag
    const newValue = currentValue ? `${currentValue}, ${tag}` : tag;
    textarea.value = newValue;
    
    // Visual feedback
    const btn = event.target;
    btn.style.background = '#38a169';
    btn.style.color = 'white';
    setTimeout(() => {
      btn.style.background = '#e2e8f0';
      btn.style.color = '#4a5568';
    }, 500);
  };

  // Load tags when user is authenticated
  auth.onAuthStateChanged(user => {
    if (user) {
      loadExistingTags();
    }
  });

  // Reload tags after adding a new card
  const originalAddCard = window.addCard;
  window.addCard = async function() {
    await originalAddCard();
    // Reload tags after adding a card
    setTimeout(loadExistingTags, 1000);
  };
})(); 