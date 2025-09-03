const profileRenderer = {
  escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  renderProfileHeader(profile, isOwnProfile) {
    document.getElementById("name").innerText = profile.displayName;
    document.getElementById("bio").innerText = profile.bio || "No bio available";
    document.getElementById("institution").innerText = profile.institution || "";
    
    const avatar = document.getElementById("avatar");
    avatar.innerText = profile.displayName.charAt(0).toUpperCase();

    // Show or hide Social & Friends button
    const socialBtn = document.getElementById("socialFriendsBtn");
    if (socialBtn) {
      socialBtn.style.display = isOwnProfile ? 'block' : 'none';
    }
  },

  renderStats(cardCount, friendCount) {
    document.getElementById("cardCount").innerText = cardCount;
    document.getElementById("friendCount").innerText = friendCount;
  },

  renderFriendRequests(requests) {
    if (requests.length === 0) {
      document.getElementById("friendRequestCenter").style.display = "none";
      return;
    }

    document.getElementById("friendRequestCenter").style.display = "block";
    const container = document.getElementById("friendRequestsContainer");
    container.innerHTML = "";

    requests.forEach(request => {
      const requestItem = document.createElement("div");
      requestItem.className = "request-item";
      requestItem.innerHTML = `
        <a href="/profile/${request.slug}" class="request-name">${this.escapeHTML(request.name)}</a>
        <div class="request-actions">
          <button class="btn btn-success btn-sm" onclick="profileController.acceptFriendRequest('${request.fromId}', '${request.id}')">Accept</button>
          <button class="btn btn-secondary btn-sm" onclick="profileController.rejectFriendRequest('${request.id}')">Reject</button>
        </div>
      `;
      container.appendChild(requestItem);
    });
  },

  renderFriendControls(friendStatus, theirId, isOwnProfile, slug) {
    const friendControls = document.getElementById("friendControls");
    
    if (isOwnProfile) {
      // Add view friends button for own profile
      friendControls.innerHTML = '';
    } else if (friendStatus.isFriend) {
      friendControls.innerHTML = '<span class="mutual-badge">✓ Friends</span>';
    } else if (friendStatus.sentRequest) {
      friendControls.innerHTML = '<span class="mutual-badge">Friend request sent</span>';
    } else if (friendStatus.receivedRequest) {
      friendControls.innerHTML = `
        <button class="btn btn-success" onclick="profileController.acceptFriendRequest('${theirId}')">Accept Friend Request</button>
        <button class="btn btn-secondary" onclick="profileController.rejectFriendRequest()">Reject</button>
      `;
    } else {
      friendControls.innerHTML = `<button class="btn btn-primary" onclick="profileController.sendFriendRequest('${theirId}')">Add Friend</button>`;
    }

    // Add view friends button
    const viewFriendsBtn = document.createElement("button");
    viewFriendsBtn.className = "btn btn-secondary";
    viewFriendsBtn.innerText = "View Friends";
            viewFriendsBtn.onclick = () => window.location.href = `/friends/${slug}`;
    friendControls.appendChild(viewFriendsBtn);
  },

  renderMutualFriends(mutualData) {
  const mutualBadge = document.getElementById("mutualBadge");
  mutualBadge.innerHTML = "";

  if (!mutualData || !Array.isArray(mutualData.names) || mutualData.names.length === 0) return;

  const badge = document.createElement("div");
  badge.className = "mutual-badge";
  const moreText = mutualData.moreCount > 0 ? ` and ${mutualData.moreCount} other${mutualData.moreCount > 1 ? "s" : ""}` : "";
  badge.innerText = `Mutual friends: ${mutualData.names.join(", ")}${moreText}`;
  mutualBadge.appendChild(badge);
},

  renderFlashcards(cards, currentUser) {
    const container = document.getElementById("cardList");

    if (cards.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <p>No flashcards available</p>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    cards.forEach(card => {
      const isOwner = currentUser && currentUser.uid === card.userId;
      
      const cardElement = document.createElement("div");
      cardElement.className = "flashcard-item";
      
      const tags = (card.tags || []).map(tag => `<span class="tag">${this.escapeHTML(tag)}</span>`).join('');
      
      // Handle hints that might be arrays or strings
      let hintsText = '';
      if (card.hints) {
        if (Array.isArray(card.hints)) {
          hintsText = card.hints.join(' ');
        } else {
          hintsText = card.hints;
        }
      }
      const preview = hintsText ? this.escapeHTML(hintsText.substring(0, 100)) + "..." : "Click to view full card";
      
      cardElement.innerHTML = `
        <div class="flashcard-statement">${this.escapeHTML(card.statement)}</div>
        <div class="flashcard-preview">${preview}</div>
        <div class="flashcard-tags">${tags}</div>
        <div class="flashcard-actions">
          <button class="btn btn-upvote btn-sm" onclick="event.stopPropagation(); profileController.upvoteCard('${card.id}')">
            👍 Upvote (${card.likeCount || 0})
          </button>
          ${isOwner ? 
            `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); profileController.editPublicCard('${card.id}')">Edit</button>
             <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); profileController.deletePublicCardDirect('${card.id}')">Delete</button>` :
            `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); profileController.saveCard('${card.id}')">Save</button>`
          }
        </div>
      `;

      cardElement.addEventListener("click", () => {
        window.open(`/card/${card.slug}`, "_blank");
      });

      container.appendChild(cardElement);
    });
  },

  renderError(message) {
    const container = document.getElementById("cardList");
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>${this.escapeHTML(message)}</p>
      </div>
    `;
  },

  showEditPopup(card) {
    document.getElementById("editStatement").value = card.statement || "";
    
    // Handle hints that might be arrays or strings
    let hintsText = '';
    if (card.hints) {
      if (Array.isArray(card.hints)) {
        hintsText = card.hints.join(' ');
      } else {
        hintsText = card.hints;
      }
    }
    document.getElementById("editHints").value = hintsText;
    
    document.getElementById("editProof").value = card.proof || "";
    document.getElementById("editTags").value = (card.tags || []).join(", ");
    document.getElementById("editPopup").style.display = "block";
  },

  hideEditPopup() {
    document.getElementById("editPopup").style.display = "none";
  },

  getEditFormData() {
    return {
      statement: document.getElementById("editStatement").value.trim(),
      hints: document.getElementById("editHints").value.trim(),
      proof: document.getElementById("editProof").value.trim(),
      tags: document.getElementById("editTags").value.split(",").map(x => x.trim()).filter(Boolean)
    };
  }
};