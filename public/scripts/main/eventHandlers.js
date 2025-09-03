// Event handlers for UI interactions
function createEventHandlers(dependencies) {
  const { 
    flashcardController, 
    uiRenderer, 
    authService, 
    subscriptionService, 
    analytics,
    auth,
    appController 
  } = dependencies;

  // Flashcard navigation
  function flip() {
    flashcardController.flip();
    flashcardController.renderCard();
  }

  function prevCard() {
    const filtered = flashcardController.getFilteredFlashcards();
    flashcardController.prev(filtered);
    flashcardController.renderCard();
  }

  function nextCard() {
    const filtered = flashcardController.getFilteredFlashcards();
    flashcardController.next(filtered);
    flashcardController.renderCard();
  }

  function restartDeck() {
    // Invalidate cache to fetch fresh data from Firestore
    localStorage.setItem("invalidate_cache", "true");
    
    // Reload cards from database
    flashcardController.loadCards();
  }

  // Filter handling
  function applyTagFilter() {
    const selected = uiRenderer.getSelectedTagFilters();
    const includeUntagged = selected.includes("__UNTAGGED__");
    const tagFilter = selected.filter(x => x !== "__UNTAGGED__");

    flashcardController.setTagFilter(tagFilter, includeUntagged);
    handleToggleFilter(); // closes popup
    flashcardController.renderCard();
  }

  function handleToggleFilter() {
    uiRenderer.toggleFilterPopup(
      flashcardController.getFlashcards(),
      flashcardController.getCurrentTagFilter(),
      flashcardController.getIncludeUntaggedInFilter()
    );
  }

  // List popup handling
    function handleToggleListPopup() {
      uiRenderer.toggleListPopup(
        flashcardController.getFilteredFlashcards(),
        flashcardController.getCurrentTagFilter(),
        flashcardController.getIncludeUntaggedInFilter(),
        {
          onPreview: previewCard,
          onEdit: editFlashcard,
          onDelete: async (i) => {
            if (confirm("Delete this card?")) {
              await flashcardController.deleteCard(i);
            }
          }
        }
      );
    }

  function handleCloseListPopup() {
    uiRenderer.closeListPopup();
  }

  function previewCard(i) {
    flashcardController.setIndex(i);
    uiRenderer.closeListPopup();
    flashcardController.renderCard();
  }

  // Edit handling
  function editFlashcard(i) {
    const flashcards = appController.getFlashcards();
    appController.setEditIndex(i);
    
    document.getElementById("editStatement").value = flashcards[i].statement;
    document.getElementById("editHints").value = flashcards[i].hints;
    document.getElementById("editProof").value = flashcards[i].proof;
    document.getElementById("editTags").value = (flashcards[i].tags || []).join(", ");
    document.getElementById("editPopup").style.display = "block";
  }

  function closeEditPopup() {
    appController.setEditIndex(-1);
    document.getElementById("editPopup").style.display = "none";
  }

  async function saveEdit() {
    const editIndex = appController.getEditIndex();
    if (editIndex === -1) return;

    await flashcardController.updateCard(editIndex, {
      statement: document.getElementById("editStatement").value.trim(),
      hints: document.getElementById("editHints").value.trim(),
      proof: document.getElementById("editProof").value.trim(),
      tags: document.getElementById("editTags").value.trim().split(",").map(x => x.trim()).filter(Boolean)
    });
    closeEditPopup();
  }

  // Card creation
  async function addCard() {
    const userId = appController.getUserId();
    const s = document.getElementById("newStatement").value.trim();
    const h = document.getElementById("newHints").value.trim();
    const p = document.getElementById("newProof").value.trim();
    const t = document.getElementById("newTags").value.trim();
    const makePublic = document.getElementById("makePublic").checked;

    if (!s || !h || !p || !userId) return;

    const tagsArray = t ? t.split(",").map(x => x.trim()).filter(Boolean) : [];

    await flashcardController.addCard({
      statement: s,
      hints: h,
      proof: p,
      tags: tagsArray
    }, makePublic);

    // Clear form
    document.getElementById("newStatement").value = "";
    document.getElementById("newHints").value = "";
    document.getElementById("newProof").value = "";
    document.getElementById("newTags").value = "";
    document.getElementById("makePublic").checked = false;
  }

  // Authentication
  function signInWithGoogle() {
    authService.signInWithGoogle();
  }

  function logout() {
    authService.logout();
  }

  function toggleAuthDetails() {
    const summary = document.getElementById("authSummary");
    const details = document.getElementById("authDetails");
    const isVisible = details.style.display !== "none";
    details.style.display = isVisible ? "none" : "block";
  }

  // Subscription
  function startSubscription() {
    subscriptionService.startSubscription();
  }

  function openBillingPortal() {
    subscriptionService.openBillingPortal();
  }

  // Return public interface
  return {
    flip,
    prevCard,
    nextCard,
    restartDeck,
    applyTagFilter,
    handleToggleFilter,
    handleToggleListPopup,
    handleCloseListPopup,
    previewCard,
    editFlashcard,
    closeEditPopup,
    saveEdit,
    addCard,
    signInWithGoogle,
    logout,
    toggleAuthDetails,
    startSubscription,
    openBillingPortal
  };
}