function createProfileController(services, renderer) {
  const { authService, profileService, friendService, publicCardService } = services;
  
  let currentProfile = null;
  let currentSlug = null;
  let currentEditId = null;
  let currentSort = "upvotes";

  async function loadProfile() {
    try {
      const path = window.location.pathname;
      const slug = path.split('/profile/')[1];
      if (!slug) {
        alert("Missing slug in URL.");
        return;
      }

      currentSlug = slug;
      const profile = await profileService.getProfileBySlug(slug);
      currentProfile = profile;

      const currentUser = authService.getCurrentUser();
      const isOwnProfile = currentUser && currentUser.uid === profile.userId;

      renderer.renderProfileHeader(profile, isOwnProfile);

      // Load friend requests for own profile
      if (isOwnProfile) {
        const friendRequests = await friendService.getFriendRequests(currentUser.uid);
        renderer.renderFriendRequests(friendRequests);
      }

      // Handle friend controls
      await setupFriendControls(profile, slug, isOwnProfile, currentUser);

      // Load flashcards and update stats
      const cards = await publicCardService.getPublicCardsBySlug(slug, currentSort);
      const friendCount = await friendService.getFriendCount(profile.userId);
      
      renderer.renderStats(cards.length, friendCount);
      renderer.renderFlashcards(cards, currentUser);

      // Trigger MathJax rendering
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise();
      }

    } catch(err) {
      console.error("Error loading profile:", err);
      renderer.renderError("Failed to load profile");
    }
  }

  async function setupFriendControls(profile, slug, isOwnProfile, currentUser) {
    if (!isOwnProfile && currentUser) {
      const theirId = profile.userId;
      const myId = currentUser.uid;

      const friendStatus = await friendService.checkFriendStatus(myId, theirId);
      renderer.renderFriendControls(friendStatus, theirId, isOwnProfile, slug);

      // Load mutual friends
      const mutualData = await friendService.getMutualFriends(myId, theirId);
      renderer.renderMutualFriends(mutualData);
    } else {
      renderer.renderFriendControls({}, null, isOwnProfile, slug);
    }
  }

  async function sendFriendRequest(theirId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      window.location.href = "/index.html";
      return;
    }

    try {
      const mySlug = await profileService.getUserSlug(currentUser.uid);
      if (!mySlug) {
        alert("You need a public profile to send friend requests.");
        window.location.href = "/create-profile.html";
        return;
      }

      await friendService.sendFriendRequest(currentUser.uid, theirId);
      alert("Friend request sent!");
      location.reload();
    } catch (err) {
      console.error("Error sending friend request:", err);
      alert("Failed to send friend request.");
    }
  }

  async function acceptFriendRequest(fromId, requestId = null) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    try {
      await friendService.acceptFriendRequest(fromId, currentUser.uid, requestId);
      alert("Friend added!");
      location.reload();
    } catch (err) {
      console.error("Error accepting friend request:", err);
      alert("Failed to accept friend request.");
    }
  }

  async function rejectFriendRequest(requestId) {
    if (!requestId) return;

    try {
      await friendService.rejectFriendRequest(requestId);
      alert("Request rejected");
      location.reload();
    } catch (err) {
      console.error("Error rejecting friend request:", err);
      alert("Failed to reject friend request.");
    }
  }

  async function saveCard(cardId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      window.location.href = "/index.html";
      return;
    }

    try {
      const cardData = await publicCardService.getPublicCard(cardId);
      await publicCardService.saveCardToPersonal(currentUser.uid, cardData);
      
      localStorage.setItem("invalidate_cache", "true");
      alert("Flashcard saved to your account!");
    } catch (err) {
      console.error("Error saving card:", err);
      alert("Failed to save card.");
    }
  }

  async function editPublicCard(cardId) {
    try {
      const card = await publicCardService.getPublicCard(cardId);
      currentEditId = cardId;
      renderer.showEditPopup(card);
    } catch (err) {
      console.error("Error loading card for edit:", err);
      alert("Failed to load card.");
    }
  }

  function closeEditPopup() {
    renderer.hideEditPopup();
    currentEditId = null;
  }

  async function savePublicEdit() {
    if (!currentEditId) return;

    try {
      const formData = renderer.getEditFormData();
      await publicCardService.updatePublicCard(currentEditId, formData);
      alert("Card updated successfully!");
      closeEditPopup();
      loadProfile();
    } catch (err) {
      console.error("Error updating card:", err);
      alert("Failed to update card.");
    }
  }

  async function deletePublicCard() {
    if (!currentEditId) return;
    if (!confirm("Are you sure you want to delete this public card?")) return;

    try {
      await publicCardService.deletePublicCard(currentEditId);
      alert("Card deleted successfully!");
      closeEditPopup();
      loadProfile();
    } catch (err) {
      console.error("Error deleting card:", err);
      alert("Failed to delete card.");
    }
  }

  async function deletePublicCardDirect(cardId) {
    if (!confirm("Are you sure you want to delete this public card?")) return;

    try {
      await publicCardService.deletePublicCard(cardId);
      alert("Card deleted successfully!");
      loadProfile();
    } catch (err) {
      console.error("Error deleting card:", err);
      alert("Failed to delete card.");
    }
  }

  async function upvoteCard(cardId) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      alert("You must be logged in to upvote.");
      return;
    }
    try {
      const functions = firebase.functions();
      const upvote = functions.httpsCallable('upvotePublicCard');
      await upvote({ cardId });
      alert("Upvoted!");
      loadProfile();
    } catch (err) {
      if (err.details && err.details.includes('already upvoted')) {
        alert("You have already upvoted this card.");
      } else {
        alert("Failed to upvote. Please try again.");
      }
      console.error("Upvote error:", err);
    }
  }

  function changeSort(sort) {
    currentSort = sort;
    loadProfile();
  }

  return {
    loadProfile,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    saveCard,
    editPublicCard,
    closeEditPopup,
    savePublicEdit,
    deletePublicCard,
    deletePublicCardDirect,
    upvoteCard,
    changeSort
  };
}