function setupProfileEventHandlers(profileController) {
  // Make the controller globally accessible for onclick handlers
  window.profileController = profileController;

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    const popup = document.getElementById('editPopup');
    if (e.target === popup) {
      profileController.closeEditPopup();
    }
  });

  // Close popup with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const popup = document.getElementById('editPopup');
      if (popup.style.display === 'block') {
        profileController.closeEditPopup();
      }
    }
  });

  // Setup popup close button
  const closeButton = document.querySelector('.popup-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      profileController.closeEditPopup();
    });
  }

  // Setup save changes button
  const saveButton = document.querySelector('#editPopup .btn-primary');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      profileController.savePublicEdit();
    });
  }

  // Setup delete button in popup
  const deleteButton = document.querySelector('#editPopup .btn-danger');
  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      profileController.deletePublicCard();
    });
  }

  // Setup cancel button in popup
  const cancelButton = document.querySelector('#editPopup .btn-secondary');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      profileController.closeEditPopup();
    });
  }

  // Auto-resize textareas in edit popup
  const textareas = document.querySelectorAll('#editPopup textarea');
  textareas.forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  });
}

// Global functions for onclick handlers (needed for backwards compatibility)
function closeEditPopup() {
  if (window.profileController) {
    window.profileController.closeEditPopup();
  }
}

function savePublicEdit() {
  if (window.profileController) {
    window.profileController.savePublicEdit();
  }
}

function deletePublicCard() {
  if (window.profileController) {
    window.profileController.deletePublicCard();
  }
}