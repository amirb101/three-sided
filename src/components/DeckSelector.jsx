import { useState, useEffect } from 'react';
import { DeckService } from '../services/deckService';
import { useAuth } from '../contexts/AuthContext';

const DeckSelector = ({ 
  value, 
  onChange, 
  className = "", 
  placeholder = "Select a deck for this card",
  rememberSelection = true 
}) => {
  const { user } = useAuth();
  const [userDecks, setUserDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState(null);

  // Load user decks and remembered selection
  useEffect(() => {
    loadUserDecks();
    loadRememberedSelection();
  }, [user]);

  const loadUserDecks = async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const decks = await DeckService.getUserDecks(user.uid, true);
      setUserDecks(decks);
    } catch (error) {
      console.error('Error loading user decks:', error);
      setUserDecks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRememberedSelection = () => {
    if (!rememberSelection || !user?.uid) return;
    
    const rememberedDeckId = localStorage.getItem(`selectedDeck_${user.uid}`);
    if (rememberedDeckId && !value) {
      // Find the deck and set it
      const deck = userDecks.find(d => d.id === rememberedDeckId);
      if (deck) {
        setSelectedDeck(deck);
        onChange(rememberedDeckId);
      }
    }
  };

  // Load remembered selection when decks are loaded
  useEffect(() => {
    if (userDecks.length > 0 && !value && rememberSelection && user?.uid) {
      const rememberedDeckId = localStorage.getItem(`selectedDeck_${user.uid}`);
      if (rememberedDeckId) {
        const deck = userDecks.find(d => d.id === rememberedDeckId);
        if (deck) {
          setSelectedDeck(deck);
          onChange(rememberedDeckId);
        }
      }
    }
  }, [userDecks, value, rememberSelection, user?.uid, onChange]);

  // Update selected deck when value changes
  useEffect(() => {
    if (value && userDecks.length > 0) {
      const deck = userDecks.find(d => d.id === value);
      setSelectedDeck(deck || null);
    } else {
      setSelectedDeck(null);
    }
  }, [value, userDecks]);

  // Handle deck selection
  const selectDeck = (deck) => {
    setSelectedDeck(deck);
    onChange(deck.id);
    setShowDropdown(false);
    
    // Remember the selection
    if (rememberSelection && user?.uid) {
      localStorage.setItem(`selectedDeck_${user.uid}`, deck.id);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedDeck(null);
    onChange('');
    if (rememberSelection && user?.uid) {
      localStorage.removeItem(`selectedDeck_${user.uid}`);
    }
  };

  // Find default deck
  const defaultDeck = userDecks.find(deck => deck.isDefault);
  const otherDecks = userDecks.filter(deck => !deck.isDefault);

  return (
    <div className="relative">
      {/* Selection Display */}
      <div 
        className={`relative ${className}`}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div 
          className="claude-input w-full cursor-pointer flex items-center justify-between"
          style={{ minHeight: '44px' }}
        >
          {selectedDeck ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedDeck.icon || '📚'}</span>
              <div>
                <div className="text-white font-medium">{selectedDeck.name}</div>
                <div className="text-sm claude-text-secondary">
                  {selectedDeck.cardCount || 0} cards • {selectedDeck.subject || 'General'}
                </div>
              </div>
            </div>
          ) : (
            <span className="claude-text-muted">{placeholder}</span>
          )}
          
          <div className="flex items-center gap-2">
            {selectedDeck && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Clear selection"
              >
                ×
              </button>
            )}
            <span className="text-gray-400">
              {showDropdown ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div 
          className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg shadow-lg border"
          style={{
            backgroundColor: 'var(--claude-surface)',
            borderColor: 'var(--claude-border)',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {isLoading ? (
            <div className="p-4 claude-text-muted text-center">
              Loading decks...
            </div>
          ) : userDecks.length === 0 ? (
            <div className="p-4 text-center">
              <div className="claude-text-muted mb-3">No decks found</div>
              <div className="text-sm claude-text-secondary">
                Create a deck first to organize your cards
              </div>
            </div>
          ) : (
            <>
              {/* Default Deck */}
              {defaultDeck && (
                <>
                  <div className="px-4 py-2 border-b border-gray-600">
                    <div className="text-sm font-medium text-blue-400">
                      🏠 Default Collection
                    </div>
                  </div>
                  <button
                    onClick={() => selectDeck(defaultDeck)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-500/10 transition-colors border-b border-gray-700/50 ${
                      selectedDeck?.id === defaultDeck.id ? 'bg-blue-500/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{defaultDeck.icon || '📚'}</span>
                      <div>
                        <div className="text-white font-medium">{defaultDeck.name}</div>
                        <div className="text-sm claude-text-secondary">
                          {defaultDeck.cardCount || 0} cards • All your flashcards
                        </div>
                      </div>
                    </div>
                  </button>
                </>
              )}

              {/* Other Decks */}
              {otherDecks.length > 0 && (
                <>
                  <div className="px-4 py-2 border-b border-gray-600">
                    <div className="text-sm font-medium text-purple-400">
                      📁 Your Decks
                    </div>
                  </div>
                  {otherDecks.map((deck) => (
                    <button
                      key={deck.id}
                      onClick={() => selectDeck(deck)}
                      className={`w-full text-left px-4 py-3 hover:bg-purple-500/10 transition-colors border-b border-gray-700/50 last:border-b-0 ${
                        selectedDeck?.id === deck.id ? 'bg-purple-500/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{deck.icon || '📚'}</span>
                        <div>
                          <div className="text-white font-medium">{deck.name}</div>
                          <div className="text-sm claude-text-secondary">
                            {deck.cardCount || 0} cards • {deck.subject || 'General'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* No Selection Option */}
              <button
                onClick={() => {
                  clearSelection();
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 border-t border-gray-600 hover:bg-gray-500/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">○</span>
                  <div>
                    <div className="text-gray-300 font-medium">No specific deck</div>
                    <div className="text-sm claude-text-secondary">Just use default collection</div>
                  </div>
                </div>
              </button>
            </>
          )}
        </div>
      )}

      {/* Selection Memory Indicator */}
      {rememberSelection && selectedDeck && (
        <div className="mt-2 text-xs claude-text-secondary flex items-center gap-1">
          <span>💾</span>
          <span>This deck will be remembered for future cards</span>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default DeckSelector;
