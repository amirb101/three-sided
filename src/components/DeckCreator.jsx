import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DeckService } from '../services/deckService';
import { ProfileService } from '../services/profileService';

const DeckCreator = ({ onDeckCreated, onClose, editingDeck = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner',
    tags: '',
    color: '#635BFF',
    icon: '📚',
    isPublic: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Predefined color options
  const colorOptions = [
    '#635BFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
  ];

  // Predefined icon options
  const iconOptions = [
    '📚', '🧮', '🔬', '🎓', '📖', '✏️', '🎯', '💡', 
    '🚀', '⚡', '🏆', '🎨', '🔍', '💻', '🧠', '📊'
  ];

  // Subject suggestions
  const subjectOptions = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'History', 'English', 'Spanish', 'French', 'Psychology', 'Economics',
    'Philosophy', 'Art', 'Music', 'Geography', 'Other'
  ];

  // Load editing deck data
  useEffect(() => {
    if (editingDeck) {
      setFormData({
        name: editingDeck.name || '',
        description: editingDeck.description || '',
        subject: editingDeck.subject || '',
        difficulty: editingDeck.difficulty || 'beginner',
        tags: (editingDeck.tags || []).join(', '),
        color: editingDeck.color || '#635BFF',
        icon: editingDeck.icon || '📚',
        isPublic: editingDeck.isPublic || false
      });
    }
  }, [editingDeck]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please sign in to create decks');
      return;
    }

    if (!formData.name.trim()) {
      setError('Deck name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const deckData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        subject: formData.subject,
        difficulty: formData.difficulty,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        color: formData.color,
        icon: formData.icon,
        isPublic: formData.isPublic
      };

      // If making public, need author slug
      if (formData.isPublic) {
        const userSlug = await ProfileService.getUserSlug(user.uid);
        if (!userSlug) {
          setError('You must create a profile before making public decks.');
          setIsSubmitting(false);
          return;
        }
        
        deckData.authorSlug = userSlug;
        deckData.slug = await DeckService.generateUniqueSlug(formData.name, userSlug);
      }

      let deckId;
      if (editingDeck) {
        // Update existing deck
        await DeckService.updateDeck(editingDeck.id, deckData);
        deckId = editingDeck.id;
      } else {
        // Create new deck
        deckId = await DeckService.createDeck(user.uid, deckData);
      }

      setSuccess(true);
      setTimeout(() => {
        if (onDeckCreated) onDeckCreated(deckId);
        if (onClose) onClose();
      }, 1500);

    } catch (error) {
      console.error('Error saving deck:', error);
      setError(error.message || 'Failed to save deck. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="claude-card p-12 text-center max-w-lg">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold claude-success mb-4">
            {editingDeck ? 'Deck Updated!' : 'Deck Created!'}
          </h3>
          <p className="claude-text-secondary">
            Your deck has been {editingDeck ? 'updated' : 'created'} successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-4" style={{color: 'var(--claude-heading)'}}>
            {editingDeck ? '✏️ Edit Deck' : '📚 Create New Deck'}
          </h1>
          <p className="claude-text-secondary text-lg">
            {editingDeck ? 'Update your deck details' : 'Organize your flashcards into a themed collection'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="claude-card p-8">
            <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--claude-heading)'}}>
              Basic Information
            </h2>
            
            <div className="space-y-6">
              {/* Deck Name */}
              <div>
                <label className="block claude-text-secondary font-medium mb-2">
                  Deck Name <span className="claude-error">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Calculus I - Derivatives"
                  className="claude-input w-full"
                  maxLength={100}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block claude-text-secondary font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of what this deck covers..."
                  className="claude-input w-full h-24 resize-none"
                  maxLength={300}
                />
                <div className="text-xs claude-text-muted mt-1">
                  {formData.description.length}/300 characters
                </div>
              </div>

              {/* Subject and Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block claude-text-secondary font-medium mb-2">
                    Subject
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className="claude-input w-full"
                  >
                    <option value="">Select a subject</option>
                    {subjectOptions.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block claude-text-secondary font-medium mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleInputChange('difficulty', e.target.value)}
                    className="claude-input w-full"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block claude-text-secondary font-medium mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="e.g. calculus, derivatives, math (comma-separated)"
                  className="claude-input w-full"
                />
                <div className="text-xs claude-text-muted mt-1">
                  Separate tags with commas
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="claude-card p-8">
            <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--claude-heading)'}}>
              Appearance
            </h2>

            <div className="space-y-6">
              {/* Color Selection */}
              <div>
                <label className="block claude-text-secondary font-medium mb-3">
                  Deck Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleInputChange('color', color)}
                      className={`w-12 h-12 rounded-xl border-4 transition-all duration-200 ${
                        formData.color === color 
                          ? 'border-white shadow-lg scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{backgroundColor: color}}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block claude-text-secondary font-medium mb-3">
                  Deck Icon
                </label>
                <div className="flex flex-wrap gap-3">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => handleInputChange('icon', icon)}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all duration-200 ${
                        formData.icon === icon 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-110' 
                          : 'claude-card hover:scale-105'
                      }`}
                      title={icon}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block claude-text-secondary font-medium mb-3">
                  Preview
                </label>
                <div 
                  className="claude-card p-6 max-w-xs rounded-2xl shadow-lg"
                  style={{borderLeft: `6px solid ${formData.color}`}}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{backgroundColor: formData.color, color: 'white'}}
                    >
                      {formData.icon}
                    </div>
                    <div>
                      <h3 className="font-bold claude-text-primary">
                        {formData.name || 'Deck Name'}
                      </h3>
                      <p className="text-sm claude-text-muted">
                        {formData.subject || 'Subject'}
                      </p>
                    </div>
                  </div>
                  {formData.description && (
                    <p className="text-sm claude-text-secondary">
                      {formData.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Sharing */}
          <div className="claude-card p-8">
            <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--claude-heading)'}}>
              Privacy & Sharing
            </h2>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="w-5 h-5 rounded mt-1"
                  style={{
                    accentColor: 'var(--claude-accent)',
                    backgroundColor: formData.isPublic ? 'var(--claude-accent)' : 'var(--claude-surface)',
                    borderColor: 'var(--claude-border)'
                  }}
                />
                <div>
                  <span className="claude-text-secondary font-medium">
                    Make this deck public
                  </span>
                  <p className="text-sm claude-text-muted mt-1">
                    Public decks can be discovered and imported by other users. 
                    You need a profile to create public decks.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-2xl" style={{backgroundColor: 'rgba(255, 99, 99, 0.1)', border: '1px solid var(--claude-error)'}}>
              <div className="flex items-center gap-2 claude-error">
                <span>❌</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="claude-button-secondary"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="claude-button-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting || !formData.name.trim() 
                  ? 'var(--claude-muted)' 
                  : 'var(--claude-accent)'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {editingDeck ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <span>{editingDeck ? '✏️' : '📚'}</span>
                  {editingDeck ? 'Update Deck' : 'Create Deck'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeckCreator;
