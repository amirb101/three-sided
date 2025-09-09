import React, { useState, useEffect } from 'react';
import { FlashcardService } from '../services/flashcardService';
import { SecurityService } from '../services/securityService';
import { useAuth } from '../contexts/AuthContext';

const PublicFlashcardManager = ({ onClose, refreshCallback }) => {
  const { user } = useAuth();
  const [publicCards, setPublicCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCard, setEditingCard] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    statement: '',
    hints: '',
    proof: '',
    subject: '',
    tags: ''
  });

  useEffect(() => {
    if (user) {
      loadPublicCards();
    }
  }, [user]);

  const loadPublicCards = async () => {
    try {
      setLoading(true);
      const cards = await FlashcardService.getPublicFlashcardsByUser(user.uid);
      setPublicCards(cards);
      setError('');
    } catch (err) {
      console.error('Error loading public cards:', err);
      setError('Failed to load your public flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setFormData({
      statement: card.statement || '',
      hints: Array.isArray(card.hints) ? card.hints.join('\n') : (card.hints || ''),
      proof: card.proof || '',
      subject: card.subject || '',
      tags: Array.isArray(card.tags) ? card.tags.join(', ') : ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;

    try {
      // Rate limiting
      const rateLimitCheck = SecurityService.checkRateLimit(`edit_public_${user.uid}`, 10, 300000);
      if (!rateLimitCheck.allowed) {
        setError(rateLimitCheck.message);
        return;
      }

      // Validate input
      const validation = SecurityService.validateFlashcardInput(formData);
      if (!validation.isValid) {
        setError(validation.errors[0]);
        return;
      }

      // Update the public card
      await FlashcardService.updatePublicFlashcard(
        editingCard.id, 
        validation.sanitizedData, 
        user.uid
      );

      setEditingCard(null);
      setError('');
      await loadPublicCards();
      if (refreshCallback) refreshCallback();
      
    } catch (err) {
      console.error('Error updating public card:', err);
      const publicError = SecurityService.getPublicErrorMessage(err, process.env.NODE_ENV === 'production');
      setError(publicError);
    }
  };

  const handleDelete = async (cardId) => {
    try {
      // Rate limiting
      const rateLimitCheck = SecurityService.checkRateLimit(`delete_public_${user.uid}`, 5, 300000);
      if (!rateLimitCheck.allowed) {
        setError(rateLimitCheck.message);
        return;
      }

      await FlashcardService.deletePublicFlashcard(cardId, user.uid);
      setDeleteConfirm(null);
      setError('');
      await loadPublicCards();
      if (refreshCallback) refreshCallback();
      
    } catch (err) {
      console.error('Error deleting public card:', err);
      const publicError = SecurityService.getPublicErrorMessage(err, process.env.NODE_ENV === 'production');
      setError(publicError);
    }
  };

  const handleMakePrivate = async (cardId) => {
    try {
      // Rate limiting
      const rateLimitCheck = SecurityService.checkRateLimit(`toggle_public_${user.uid}`, 10, 300000);
      if (!rateLimitCheck.allowed) {
        setError(rateLimitCheck.message);
        return;
      }

      await FlashcardService.toggleFlashcardPublic(cardId, user.uid, false);
      setError('');
      await loadPublicCards();
      if (refreshCallback) refreshCallback();
      
    } catch (err) {
      console.error('Error making card private:', err);
      const publicError = SecurityService.getPublicErrorMessage(err, process.env.NODE_ENV === 'production');
      setError(publicError);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getCardUrl = (card) => {
    return `${window.location.origin}/card/${card.slug}`;
  };

  const copyCardUrl = (card) => {
    const url = getCardUrl(card);
    navigator.clipboard.writeText(url).then(() => {
      // Could add a toast notification here
      alert('Card URL copied to clipboard!');
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="claude-card p-8 rounded-2xl shadow-2xl max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="claude-text-secondary">Loading your public flashcards...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="claude-card rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-300 flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{color: 'var(--claude-heading)'}}>
            📢 Manage Public Flashcards
          </h2>
          <button
            onClick={onClose}
            className="claude-text-muted hover:text-gray-700 text-3xl transition-colors"
            aria-label="Close manager"
          >
            ×
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {publicCards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>
                No Public Flashcards Yet
              </h3>
              <p className="claude-text-secondary mb-4">
                Create flashcards and make them public to share your knowledge with the world!
              </p>
              <button
                onClick={onClose}
                className="claude-button-primary"
              >
                Create Your First Public Card
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {publicCards.map((card) => (
                <div key={card.id} className="claude-card p-6 rounded-xl border-l-4 border-l-blue-500">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2" style={{color: 'var(--claude-heading)'}}>
                        {card.statement?.length > 100 
                          ? `${card.statement.slice(0, 100)}...` 
                          : card.statement}
                      </h3>
                      <div className="flex gap-4 text-sm claude-text-secondary">
                        <span>Created: {formatDate(card.createdAt)}</span>
                        <span>❤️ {card.likeCount || 0} likes</span>
                        <span>👁️ {card.viewCount || 0} views</span>
                        <span>📥 {card.importCount || 0} imports</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyCardUrl(card)}
                        className="claude-button-secondary text-sm px-3 py-1"
                        title="Copy public URL"
                      >
                        🔗 Copy Link
                      </button>
                      <button
                        onClick={() => handleEdit(card)}
                        className="claude-button-secondary text-sm px-3 py-1"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleMakePrivate(card.id)}
                        className="claude-button-secondary text-sm px-3 py-1 text-orange-600"
                        title="Make private (remove from public)"
                      >
                        🔒 Make Private
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(card.id)}
                        className="claude-button-secondary text-sm px-3 py-1 text-red-600"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Card Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Subject & Tags:</h4>
                      <div className="flex gap-2 flex-wrap">
                        <span className="claude-tag">{card.subject || 'General'}</span>
                        {card.tags?.map((tag, index) => (
                          <span key={index} className="claude-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Public URL:</h4>
                      <a 
                        href={getCardUrl(card)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 text-xs break-all"
                      >
                        {getCardUrl(card)}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingCard && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="claude-card rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-300 flex justify-between items-center">
                <h3 className="text-xl font-bold" style={{color: 'var(--claude-heading)'}}>
                  Edit Public Flashcard
                </h3>
                <button
                  onClick={() => setEditingCard(null)}
                  className="claude-text-muted hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
                      Statement *
                    </label>
                    <textarea
                      value={formData.statement}
                      onChange={(e) => handleInputChange('statement', e.target.value)}
                      className="claude-input w-full h-24 resize-none"
                      placeholder="Enter the main statement or question..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
                      Hints
                    </label>
                    <textarea
                      value={formData.hints}
                      onChange={(e) => handleInputChange('hints', e.target.value)}
                      className="claude-input w-full h-20 resize-none"
                      placeholder="Helpful hints (optional)..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
                      Proof/Answer *
                    </label>
                    <textarea
                      value={formData.proof}
                      onChange={(e) => handleInputChange('proof', e.target.value)}
                      className="claude-input w-full h-32 resize-none"
                      placeholder="Enter the proof, solution, or answer..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
                        Subject
                      </label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        className="claude-input w-full"
                        placeholder="Mathematics, Physics, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
                        Tags
                      </label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => handleInputChange('tags', e.target.value)}
                        className="claude-input w-full"
                        placeholder="algebra, calculus, geometry (comma-separated)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-300 flex justify-end gap-3">
                <button
                  onClick={() => setEditingCard(null)}
                  className="claude-button-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="claude-button-primary"
                  disabled={!formData.statement.trim() || !formData.proof.trim()}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="claude-card rounded-2xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold mb-2 text-red-600">Delete Public Flashcard?</h3>
                <p className="claude-text-secondary mb-6">
                  This will permanently delete this flashcard from the public collection. 
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="claude-button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="claude-button-secondary bg-red-100 text-red-800 hover:bg-red-200 border-red-300"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicFlashcardManager;
