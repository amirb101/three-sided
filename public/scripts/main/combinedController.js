function createFlashcardController({
  flashcardService,
  cacheService,
  uiRenderer,
  analytics,
  db,
  setFlashcards,
  cardContainerEl = document.getElementById("card")
}) {
  let flashcards = [], docRefs = [], userId = null;
  let currentTagFilter = null, includeUntaggedInFilter = false;
  let index = 0, side = 0;
  let typesetTimeout = null;

  function safeTypeset() {
    if (typesetTimeout) clearTimeout(typesetTimeout);
    typesetTimeout = setTimeout(() => {
      try {
        if (MathJax?.startup?.document) MathJax.startup.document.clear();
        MathJax.typesetClear?.();
        if (cardContainerEl) MathJax.typesetPromise?.([cardContainerEl]);
      } catch (e) {
        console.error("MathJax typeset error:", e);
      }
      typesetTimeout = null;
    }, 50);
  }

  function setUserId(id) {
    userId = id;
  }

  function setGuestMode(welcomeCard) {
    userId = null;
    flashcards = [welcomeCard];
    docRefs = [];
    setFlashcards(flashcards);
    restart();
    renderCard();
  }

async function loadCards() {
  if (!userId) return;

  if (localStorage.getItem("invalidate_cache") === "true") {
    cacheService.clear(userId);
    localStorage.removeItem("invalidate_cache");
  }

  if (cacheService.isFresh(userId)) {
    const cached = cacheService.getCards(userId);
    if (cached) {
      console.log("Loaded cards from cache");
      // Extract IDs from cached cards
      flashcards = cached.map(({ id, ...rest }) => rest);
      docRefs = cached.map(c => c.id);
      setFlashcards(flashcards);
      restart();
      renderCard();
      return;
    }
  }

  try {
    console.log("Fetching cards from Firestore");
    const cards = await flashcardService.getUserCards(userId);
    
    // Cache the full cards INCLUDING the IDs
    cacheService.setCards(userId, cards);
    
    // Then split for internal use
    flashcards = cards.map(({ id, ...rest }) => rest);
    docRefs = cards.map(c => c.id);
    setFlashcards(flashcards);
    restart();
    renderCard();
  } catch (err) {
    console.error("Error loading cards:", err);
  }
}

  function filterFlashcards(cards) {
    if ((!currentTagFilter || currentTagFilter.length === 0) && !includeUntaggedInFilter) return cards;
    return cards.filter(fc => {
      const tags = fc.tags || [];
      const isUntagged = tags.length === 0;
      if (includeUntaggedInFilter && currentTagFilter.length === 0) return isUntagged;
      const hasMatch = tags.some(tag => currentTagFilter.includes(tag));
      return hasMatch || (includeUntaggedInFilter && isUntagged);
    });
  }

  function getFilteredFlashcards() {
    return filterFlashcards(flashcards);
  }

  function applyTagFilter(tags, includeUntagged) {
    currentTagFilter = tags;
    includeUntaggedInFilter = includeUntagged;
    restart();
    renderCard();
  }

  function getCurrentTagFilter() {
    return currentTagFilter;
  }

  function getIncludeUntaggedInFilter() {
    return includeUntaggedInFilter;
  }

  function setTagFilter(tags, includeUntagged) {
    currentTagFilter = tags;
    includeUntaggedInFilter = includeUntagged;
  }

  async function addCard(cardData, makePublic) {
    await flashcardService.addFlashcard(userId, cardData);

    if (makePublic) {
      const slugSnap = await db.collection("userToSlug").doc(userId).get();
      if (!slugSnap.exists) {
        alert("To make a card public, you must first create a profile.");
        return;
      }

      const slug = slugSnap.data().slug;
      const baseSlug = cardData.statement.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      const uniqueSlug = await ensureUniqueCardSlug(baseSlug);

      await db.collection("publicCards").doc(uniqueSlug).set({
        ...cardData,
        userId,
        authorSlug: slug,
        slug: uniqueSlug,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likeCount: 0
      });
    }

    cacheService.clear(userId);
    await loadCards();
  }

  async function ensureUniqueCardSlug(baseSlug) {
    let slug = baseSlug;
    let tries = 0;
    while (tries < 5) {
      const snap = await db.collection("publicCards").where("slug", "==", slug).limit(1).get();
      if (snap.empty) return slug;
      slug = baseSlug + "-" + Math.floor(Math.random() * 10000);
      tries++;
    }
    throw new Error("Failed to generate unique card slug after multiple attempts.");
  }

  async function updateCard(i, updatedData) {
    const id = docRefs[i];
    await flashcardService.updateFlashcard(id, { ...updatedData, userId });
    cacheService.clear(userId);
    await loadCards();
  }

  async function deleteCard(i) {
    const id = docRefs[i];
    console.log("Attempting to delete:", id, "Logged-in user:", userId);
    await flashcardService.deleteFlashcard(id);
    cacheService.clear(userId);
    await loadCards();
  }

  function flip() {
    side = (side + 1) % 3;
  }

  function prev(cards = getFilteredFlashcards()) {
    if (cards.length > 0) {
      index = (index - 1 + cards.length) % cards.length;
      side = 0;
    }
  }

  function next(cards = getFilteredFlashcards()) {
    if (cards.length > 0) {
      index = (index + 1) % cards.length;
      side = 0;
    }
  }

  function restart() {
    index = 0;
    side = 0;
  }

  function renderCard(cards = getFilteredFlashcards()) {
    if (!cards || cards.length === 0) {
      uiRenderer.renderCardMessage(userId ? "No flashcards (or none match this filter.)" : "Please log in...");
      uiRenderer.renderStatus(0, 0);
      return;
    }

    if (index >= cards.length) index = 0;

    const card = cards[index];
    uiRenderer.renderCard(card, side);
    uiRenderer.renderStatus(index, cards.length);
    safeTypeset();
  }
  function getFlashcards() {
  return flashcards;
}


  return {
    setUserId,
    setGuestMode,
    getFlashcards,
    loadCards,
    addCard,
    updateCard,
    deleteCard,
    applyTagFilter,
    getFilteredFlashcards,
    getCurrentTagFilter,
    getIncludeUntaggedInFilter,
    setTagFilter,
    flip,
    prev,
    next,
    restart,
    renderCard,
    getIndex: () => index,
    setIndex: (i) => { index = i; side = 0; }
  };
} // End of createFlashcardController
