import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DeckService } from '../services/deckService';

const DeckManager = ({ onCreateDeck, onEditDeck, onSelectDeck }) => {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, public, private

  useEffect(() => {
    if (user) {
      loadUserDecks();
    }
  }, [user]);

  const loadUserDecks = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const userDecks = await DeckService.getUserDecks(user.uid);
      setDecks(userDecks);
    } catch (error) {
      console.error('Error loading decks:', error);
      setError('Failed to load decks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDeck = async (deckId, deckName) => {
    if (!window.confirm(`Are you sure you want to delete "${deckName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await DeckService.deleteDeck(deckId);
      setDecks(decks.filter(deck => deck.id !== deckId));
    } catch (error) {
      console.error('Error deleting deck:', error);
      setError('Failed to delete deck. Please try again.');
    }
  };

  const filteredDecks = decks.filter(deck => {
    const matchesSearch = !searchQuery || 
      deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deck.subject && deck.subject.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filterBy === 'all' || 
      (filterBy === 'public' && deck.isPublic) ||
      (filterBy === 'private' && !deck.isPublic);

    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="claude-card p-8 text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="claude-text-secondary">Loading your decks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold mb-2" style={{color: 'var(--claude-heading)'}}>
              📚 My Decks
            </h1>
            <p className="claude-text-secondary">
              Organize and manage your flashcard collections
            </p>
          </div>
          
          <button
            onClick={() => onCreateDeck && onCreateDeck()}
            className="claude-button-primary mt-4 md:mt-0 flex items-center gap-2"
          >
            <span>➕</span>
            Create New Deck
          </button>
        </div>

        {/* Search and Filters */}
        <div className="claude-card p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search decks by name, subject, or description..."
                className="claude-input w-full"
              />
            </div>

            {/* Filter */}
            <div className="md:w-48">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="claude-input w-full"
              >
                <option value="all">All Decks</option>
                <option value="private">Private Only</option>
                <option value="public">Public Only</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t" style={{borderColor: 'var(--claude-border)'}}>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{color: 'var(--claude-heading)'}}>
                {decks.length}
              </div>
              <div className="text-sm claude-text-muted">Total Decks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{color: 'var(--claude-heading)'}}>
                {decks.reduce((sum, deck) => sum + (deck.cardCount || 0), 0)}
              </div>
              <div className="text-sm claude-text-muted">Total Cards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{color: 'var(--claude-heading)'}}>
                {decks.filter(deck => deck.isPublic).length}
              </div>
              <div className="text-sm claude-text-muted">Public Decks</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-2xl mb-6" style={{backgroundColor: 'rgba(255, 99, 99, 0.1)', border: '1px solid var(--claude-error)'}}>
            <div className="flex items-center gap-2 claude-error">
              <span>❌</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Decks Grid */}
        {filteredDecks.length === 0 ? (
          <div className="claude-card p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-2" style={{color: 'var(--claude-heading)'}}>
              {searchQuery || filterBy !== 'all' ? 'No matching decks found' : 'No decks yet'}
            </h3>
            <p className="claude-text-secondary mb-6">
              {searchQuery || filterBy !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first deck to start organizing your flashcards'
              }
            </p>
            {(!searchQuery && filterBy === 'all') && (
              <button
                onClick={() => onCreateDeck && onCreateDeck()}
                className="claude-button-primary flex items-center gap-2 mx-auto"
              >
                <span>➕</span>
                Create Your First Deck
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDecks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onEdit={() => onEditDeck && onEditDeck(deck)}
                onDelete={() => handleDeleteDeck(deck.id, deck.name)}
                onSelect={() => onSelectDeck && onSelectDeck(deck)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DeckCard = ({ deck, onEdit, onDelete, onSelect }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      className="claude-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer relative group"
      style={{borderLeft: `6px solid ${deck.color || '#635BFF'}`}}
      onClick={() => onSelect && onSelect()}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl text-white"
            style={{backgroundColor: deck.color || '#635BFF'}}
          >
            {deck.icon || '📚'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold claude-text-primary truncate">
              {deck.name}
            </h3>
            <p className="text-sm claude-text-muted">
              {deck.subject || 'No subject'}
            </p>
          </div>
        </div>

        {/* Action Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800"
              title="Edit deck"
            >
              ✏️
            </button>
            {!deck.isDefault && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-800"
                title="Delete deck"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {deck.description && (
        <p className="text-sm claude-text-secondary mb-4 line-clamp-2">
          {deck.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm claude-text-muted mb-4">
        <span>{deck.cardCount || 0} cards</span>
        <span>{deck.difficulty || 'Mixed'}</span>
      </div>

      {/* Tags */}
      {deck.tags && deck.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {deck.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded-full text-xs"
              style={{
                backgroundColor: `${deck.color || '#635BFF'}20`,
                color: deck.color || '#635BFF'
              }}
            >
              {tag}
            </span>
          ))}
          {deck.tags.length > 3 && (
            <span className="px-2 py-1 rounded-full text-xs claude-text-muted">
              +{deck.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t" style={{borderColor: 'var(--claude-border)'}}>
        <div className="flex items-center gap-2">
          {deck.isPublic && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
              Public
            </span>
          )}
          {deck.isDefault && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              Default
            </span>
          )}
        </div>
        <span className="text-xs claude-text-muted">
          {formatDate(deck.updatedAt || deck.createdAt)}
        </span>
      </div>
    </div>
  );
};

export default DeckManager;
