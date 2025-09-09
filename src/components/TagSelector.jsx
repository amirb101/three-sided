import { useState, useEffect, useRef } from 'react';
import { FlashcardService } from '../services/flashcardService';
import { useAuth } from '../contexts/AuthContext';

const TagSelector = ({ value, onChange, className = "", placeholder = "Type tags here or click existing tags below" }) => {
  const { user } = useAuth();
  const [existingTags, setExistingTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const textareaRef = useRef(null);

  // Parse current tags from value
  useEffect(() => {
    const currentTags = value ? value.split(',').map(t => t.trim()).filter(t => t) : [];
    setSelectedTags(currentTags);
  }, [value]);

  // Get filtered tags based on what user is typing
  const getFilteredTags = () => {
    if (!value) return existingTags;
    
    // Get the current input (last tag being typed)
    const tags = value.split(',').map(t => t.trim());
    const lastTag = tags[tags.length - 1].toLowerCase();
    
    if (!lastTag) return existingTags;
    
    // Filter existing tags that match what's being typed
    return existingTags.filter(tag => 
      tag.toLowerCase().includes(lastTag) && !selectedTags.includes(tag)
    ).sort((a, b) => {
      // Prioritize exact matches and starts-with matches
      const aStarts = a.toLowerCase().startsWith(lastTag);
      const bStarts = b.toLowerCase().startsWith(lastTag);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    });
  };

  // Load existing tags when component mounts
  useEffect(() => {
    loadExistingTags();
  }, [user]);

  const loadExistingTags = async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get user's flashcards to extract existing tags
      const userCards = await FlashcardService.getUserFlashcards(user.uid, 200);
      
      // Also get from legacy flashcards collection
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const legacyQuery = query(
        collection(db, 'flashcards'),
        where('userId', '==', user.uid)
      );
      const legacySnap = await getDocs(legacyQuery);
      const legacyCards = legacySnap.docs.map(d => d.data());
      
      // Combine all cards
      const allCards = [...userCards, ...legacyCards];
      
      // Extract unique tags
      const tagSet = new Set();
      allCards.forEach(card => {
        if (card.tags && Array.isArray(card.tags)) {
          card.tags.forEach(tag => {
            if (tag && typeof tag === 'string') {
              tagSet.add(tag.trim());
            }
          });
        } else if (typeof card.tags === 'string') {
          // Handle comma-separated string tags
          card.tags.split(',').forEach(tag => {
            const trimmed = tag.trim();
            if (trimmed) tagSet.add(trimmed);
          });
        }
      });
      
      const sortedTags = Array.from(tagSet).sort();
      setExistingTags(sortedTags);
    } catch (error) {
      console.error('Error loading existing tags:', error);
      setExistingTags([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add existing tag to input
  const addExistingTag = (tag) => {
    const currentTags = selectedTags.slice();
    
    // Don't add if already present
    if (currentTags.includes(tag)) {
      // Visual feedback that tag is already added
      return;
    }

    // Add the tag
    const newTags = [...currentTags, tag];
    const newValue = newTags.join(', ');
    setSelectedTags(newTags);
    onChange(newValue);
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    const newValue = newTags.join(', ');
    setSelectedTags(newTags);
    onChange(newValue);
  };

  // Handle manual input changes
  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      const filteredTags = getFilteredTags();
      if (filteredTags.length > 0) {
        e.preventDefault();
        addExistingTag(filteredTags[0]); // Add first filtered tag
      }
    }
  };

  // Toggle tag selection popup
  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  return (
    <div className="relative">
      {/* Input Area */}
      <div className="mb-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`claude-input w-full resize-none ${className}`}
          rows="2"
        />
      </div>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="mb-3">
          <div className="text-sm claude-text-secondary mb-2">Selected tags:</div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: 'var(--claude-accent)',
                  color: 'white'
                }}
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  title="Remove tag"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Existing Tags Section */}
      <div className="existing-tags-section">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm claude-text-secondary">
            {value ? `Filtered tags (${getFilteredTags().length}):` : 'Click to add existing tags:'}
          </div>
          {existingTags.length > 6 && (
            <button
              onClick={togglePopup}
              className="text-sm px-2 py-1 rounded"
              style={{
                color: 'var(--claude-accent)',
                backgroundColor: 'var(--claude-accent-bg)'
              }}
            >
              View All ({existingTags.length})
            </button>
          )}
        </div>
        
        <div 
          className="existing-tags-list"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            maxHeight: '120px',
            overflowY: 'auto',
            padding: '0.75rem',
            backgroundColor: 'var(--claude-surface)',
            border: '1px solid var(--claude-border)',
            borderRadius: '8px'
          }}
        >
          {isLoading ? (
            <div className="claude-text-muted italic">Loading existing tags...</div>
          ) : existingTags.length === 0 ? (
            <div className="claude-text-muted italic">
              No existing tags found. Create your first card to see tags here!
            </div>
          ) : getFilteredTags().length === 0 && value ? (
            <div className="claude-text-muted italic">
              No tags match your search. Press Enter to add "{value.split(',').pop()?.trim()}" as a new tag.
            </div>
          ) : (
            getFilteredTags().slice(0, showPopup ? getFilteredTags().length : 12).map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => addExistingTag(tag)}
                  className={`tag-btn transition-all duration-200 ${isSelected ? 'selected' : ''}`}
                  style={{
                    backgroundColor: isSelected ? 'var(--claude-accent)' : 'var(--claude-subtle)',
                    color: isSelected ? 'white' : 'var(--claude-primary-text)',
                    border: 'none',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    opacity: isSelected ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.target.style.backgroundColor = 'var(--claude-border)';
                      e.target.style.color = 'var(--claude-heading)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.target.style.backgroundColor = 'var(--claude-subtle)';
                      e.target.style.color = 'var(--claude-primary-text)';
                    }
                  }}
                  title={isSelected ? 'Already selected' : `Add "${tag}" tag`}
                >
                  #{tag}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Full Tag Selection Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="claude-card max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold" style={{color: 'var(--claude-heading)'}}>Select Tags</h3>
              <button
                onClick={() => setShowPopup(false)}
                className="claude-text-muted hover:claude-text-secondary transition-colors text-2xl"
                style={{color: 'var(--claude-text-muted)'}}
                onMouseEnter={(e) => e.target.style.color = 'var(--claude-text-secondary)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--claude-text-muted)'}
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="claude-text-secondary">
                Click tags to add them to your flashcard:
              </p>
            </div>
            
            <div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-2"
            >
              {existingTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      addExistingTag(tag);
                      // Don't close popup, allow multiple selections
                    }}
                    className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-600 hover:border-purple-500 hover:bg-purple-500/10'
                    }`}
                  >
                    <div className="font-medium" style={{color: isSelected ? 'var(--claude-accent)' : 'var(--claude-primary-text)'}}>#{tag}</div>
                    <div className="text-sm claude-text-secondary">
                      {isSelected ? '✓ Selected' : 'Click to add'}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-600">
              <button
                onClick={() => setShowPopup(false)}
                className="claude-button-primary flex-1"
              >
                Done ({selectedTags.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagSelector;
