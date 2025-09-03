let _flashcardController = null;
const uiRenderer = {
  escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  setFlashcardController(controller) {
    _flashcardController = controller;
  },

  getCardHTML(card, side) {
    const titles = ["Statement", "Hints", "Proof"];
    // DON'T escape the content - let it render as-is for LaTeX and formatting
    const rawContent = [card.statement, card.hints, card.proof][side] || "";

    const tagString = (card.tags || []).map(tag => this.escapeHTML(tag)).join(", ");
    const tagsHTML = tagString
      ? `<div style="margin-top:0.5rem;"><small style="color:gray">Tags: ${tagString}</small></div>`
      : "";

    return `<b>${titles[side]}:</b><br>${rawContent}${tagsHTML}`;
  },

  // FIXED: Updated to use proper CSS classes for buttons
  getFlashcardListHTML(cards) {
    return cards.map((fc, i) => {
      // Don't escape the statement content for preview either
      const statement = fc.statement || "";
      const preview = statement.length > 100
        ? statement.slice(0, 100) + "..."
        : statement;

      const tagString = (fc.tags || []).map(tag => this.escapeHTML(tag)).join(", ");
      const tagHTML = tagString ? `<small style="color: gray">[${tagString}]</small>` : "";

      return `
        <div class="flashcard-list-item">
          <div class="flashcard-item-content">
            <b>${i + 1}.</b> ${preview} ${tagHTML}
          </div>
          <div class="flashcard-item-actions">
            <button class="flashcard-action-btn btn-preview" data-index="${i}">Preview</button>
            <button class="flashcard-action-btn btn-edit" data-index="${i}">Edit</button>
            <button class="flashcard-action-btn btn-delete" data-index="${i}">Delete</button>
          </div>
        </div>`;
    }).join("");
  },

  renderCard(card, side) {
    const cardEl = document.getElementById("card");
    const html = this.getCardHTML(card, side);

    if (cardEl.innerHTML !== html) {
      cardEl.innerHTML = "";
      cardEl.innerHTML = html;
    }
  },

  renderFlashcardList(cards, options = {}) {
    const {
      onPreview = () => {},
      onEdit = () => {},
      onDelete = () => {}
    } = options;

    const flashcardList = document.getElementById("flashcardList");
    flashcardList.innerHTML = this.getFlashcardListHTML(cards);

    // The key fix: use the actual index from the full flashcards array
    flashcardList.querySelectorAll(".btn-preview").forEach((btn, i) => {
      btn.onclick = () => {
        // Find the index in the full flashcards array
        const fullFlashcards = _flashcardController.getFlashcards();
        const fullIndex = fullFlashcards.indexOf(cards[i]);
        console.log("Preview clicked, local index:", i, "full index:", fullIndex);
        if (fullIndex !== -1) onPreview(fullIndex);
      };
    });

    flashcardList.querySelectorAll(".btn-edit").forEach((btn, i) => {
      btn.onclick = () => {
        const fullFlashcards = _flashcardController.getFlashcards();
        const fullIndex = fullFlashcards.indexOf(cards[i]);
        console.log("Edit clicked, local index:", i, "full index:", fullIndex);
        if (fullIndex !== -1) onEdit(fullIndex);
      };
    });

    flashcardList.querySelectorAll(".btn-delete").forEach((btn, i) => {
      btn.onclick = () => {
        const fullFlashcards = _flashcardController.getFlashcards();
        const fullIndex = fullFlashcards.indexOf(cards[i]);
        console.log("Delete clicked, local index:", i, "full index:", fullIndex);
        if (fullIndex !== -1) onDelete(fullIndex);
      };
    });
  },

  renderStatus(index, total) {
    document.getElementById("status").innerText = `Card ${index + 1} of ${total}`;
  },

  // FIXED: Updated tag checkboxes to use proper styling
  renderTagCheckboxes(flashcards, selectedTags, includeUntagged) {
    const tagSet = new Set();
    flashcards.forEach(fc => (fc.tags || []).forEach(tag => tagSet.add(tag)));
    const tags = Array.from(tagSet).sort();

    const container = document.getElementById("tagCheckboxContainer");
    container.innerHTML =
      tags.map(tag => `
        <label class="tag-checkbox-item">
          <input type="checkbox" value="${this.escapeHTML(tag)}" ${selectedTags && selectedTags.includes(tag) ? "checked" : ""}>
          <span>${this.escapeHTML(tag)}</span>
        </label>
      `).join("") +
      `
        <label class="tag-checkbox-item" style="margin-top: 0.5rem;">
          <input type="checkbox" value="__UNTAGGED__" ${includeUntagged ? "checked" : ""}>
          <span>(untagged)</span>
        </label>
      `;
  },

  renderCardMessage(message) {
    const cardEl = document.getElementById("card");
    if (cardEl) {
      cardEl.innerText = message;
    }
  },

  showLoading() {
    this.showPopupWithBackdrop("loadingPopup");
  },

  hideLoading() {
    this.hidePopupWithBackdrop("loadingPopup");
  },

  // FIXED: Added backdrop support for better popup handling
  showPopupWithBackdrop(popupId) {
    // Create backdrop if it doesn't exist
    let backdrop = document.getElementById("popup-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "popup-backdrop";
      backdrop.className = "popup-backdrop";
      document.body.appendChild(backdrop);
    }
    
    backdrop.style.display = "block";
    document.getElementById(popupId).style.display = "block";
    
    // Prevent body scrolling
    document.body.style.overflow = "hidden";
  },

  hidePopupWithBackdrop(popupId) {
    const backdrop = document.getElementById("popup-backdrop");
    if (backdrop) {
      backdrop.style.display = "none";
    }
    
    document.getElementById(popupId).style.display = "none";
    
    // Restore body scrolling
    document.body.style.overflow = "auto";
  },

  toggleAddForm() {
    const content = document.getElementById("addFormContent");
    const toggle = document.getElementById("toggleAddForm");

    const isOpen = content.style.display !== "none";
    content.style.display = isOpen ? "none" : "block";
    toggle.innerText = isOpen
      ? "▼ Try AI without signing up"
      : "▲ Hide Flashcard Form";
  },

  toggleComparison() {
    const content = document.getElementById("comparisonContent");
    const toggle = document.getElementById("toggleComparison");

    const isOpen = content.style.display !== "none";
    content.style.display = isOpen ? "none" : "block";
    toggle.innerText = isOpen ? "▼ Click to see Premium advantages" : "▲ Hide Premium advantages";
  },

  // FIXED: Updated to use backdrop
  toggleFilterPopup(flashcards, currentTagFilter, includeUntaggedInFilter) {
    const popup = document.getElementById("filterPopup");
    const isOpen = popup.style.display === "block";
    
    if (isOpen) {
      this.hidePopupWithBackdrop("filterPopup");
    } else {
      this.showPopupWithBackdrop("filterPopup");
      this.renderTagCheckboxes(flashcards, currentTagFilter, includeUntaggedInFilter);
    }
  },

  getSelectedTagFilters() {
    const checkboxes = document.querySelectorAll('#tagCheckboxContainer input[type="checkbox"]');
    const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    return selected;
  },

  // FIXED: Updated to use backdrop and proper parameter handling
  toggleListPopup(cards, currentTagFilter, includeUntaggedInFilter, handlers = {}) {
    const {
      onPreview = () => {},
      onEdit = () => {},
      onDelete = () => {}
    } = handlers;

    const listPopup = document.getElementById("listPopup");
    const isOpen = listPopup.style.display === "block";
    
    if (isOpen) {
      this.hidePopupWithBackdrop("listPopup");
    } else {
      this.showPopupWithBackdrop("listPopup");
      const visibleCards = this.filterCards(cards, currentTagFilter, includeUntaggedInFilter);
      this.renderFlashcardList(visibleCards, { onPreview, onEdit, onDelete });
    }
  },

  // Helper function for filtering (since filterFlashcards might not be available in this scope)
  filterCards(cards, tagFilter, includeUntagged) {
    if ((!tagFilter || tagFilter.length === 0) && !includeUntagged) return cards;

    return cards.filter(fc => {
      const tags = fc.tags || [];
      const isUntagged = tags.length === 0;
      if (includeUntagged && tagFilter.length === 0) return isUntagged;
      const hasMatch = tags.some(tag => tagFilter.includes(tag));
      return hasMatch || (includeUntagged && isUntagged);
    });
  },

  closeListPopup() {
    this.hidePopupWithBackdrop("listPopup");
  },

  // FIXED: Added method to close filter popup
  closeFilterPopup() {
    this.hidePopupWithBackdrop("filterPopup");
  }
};