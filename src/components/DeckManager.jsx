import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DeckService } from '../services/deckService';
import { ImportExportService } from '../services/importExportService';
import { BookIcon, EditIcon, DeleteIcon, ErrorIcon, DownloadIcon, UploadIcon, CopyIcon } from './icons';

const DeckManager = ({ onCreateDeck, onEditDeck, onSelectDeck }) => {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, public, private
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedDeckForExport, setSelectedDeckForExport] = useState(null);
  const [selectedDeckForImport, setSelectedDeckForImport] = useState(null);

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

  const handleExportDeck = (deck) => {
    setSelectedDeckForExport(deck);
    setShowExportModal(true);
  };

  const handleImportToDeck = (deck) => {
    setSelectedDeckForImport(deck);
    setShowImportModal(true);
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
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white shadow-lg" style={{background: 'linear-gradient(135deg, #6B5B4A 0%, #5A4A3A 100%)'}}>
              <BookIcon size={32} color="white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold" style={{color: 'var(--claude-heading)'}}>
                My Decks
              </h1>
              <p className="claude-text-secondary">
                Organize and manage your flashcard collections
              </p>
            </div>
          </div>
          
          <button
            onClick={() => onCreateDeck && onCreateDeck()}
            className="claude-button-primary mt-4 md:mt-0 flex items-center gap-2"
            style={{background: 'linear-gradient(135deg, #6B5B4A 0%, #5A4A3A 100%)'}}
          >
            <span className="text-lg">+</span>
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
              <ErrorIcon size={16} color="red" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Decks Grid */}
        {filteredDecks.length === 0 ? (
          <div className="claude-card p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{background: 'linear-gradient(135deg, #6B5B4A 0%, #5A4A3A 100%)'}}>
              <BookIcon size={40} color="white" />
            </div>
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
                style={{background: 'linear-gradient(135deg, #6B5B4A 0%, #5A4A3A 100%)'}}
              >
                <span className="text-lg">+</span>
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
                onExport={() => handleExportDeck(deck)}
                onImport={() => handleImportToDeck(deck)}
              />
            ))}
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && selectedDeckForExport && (
          <ExportModal
            deck={selectedDeckForExport}
            onClose={() => {
              setShowExportModal(false);
              setSelectedDeckForExport(null);
            }}
          />
        )}

        {/* Import Modal */}
        {showImportModal && selectedDeckForImport && (
          <ImportModal
            deck={selectedDeckForImport}
            onClose={() => {
              setShowImportModal(false);
              setSelectedDeckForImport(null);
            }}
            onSuccess={() => {
              loadUserDecks(); // Refresh decks after import
              setShowImportModal(false);
              setSelectedDeckForImport(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Export Modal Component
const ExportModal = ({ deck, onClose }) => {
  const [format, setFormat] = useState('obsidian');
  const [exportContent, setExportContent] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError('');
      
      const content = await ImportExportService.exportDeck(deck.id, format);
      setExportContent(content);
    } catch (error) {
      console.error('Export error:', error);
      setError(`Failed to export deck: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      // Show success feedback
      const button = document.getElementById('copy-button');
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      setError('Failed to copy to clipboard');
    }
  };

  const getFormatDescription = (fmt) => {
    switch (fmt) {
      case 'obsidian':
        return 'Markdown format for Obsidian vault import';
      case 'anki-csv':
        return 'CSV format compatible with Anki imports';
      case 'anki-html':
        return 'HTML format for Anki with rich formatting';
      case 'csv':
        return 'Simple CSV format for spreadsheet applications';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="claude-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DownloadIcon size={24} color="blue" />
              <div>
                <h2 className="text-2xl font-bold claude-text-primary">Export Deck</h2>
                <p className="claude-text-secondary">Export "{deck.name}" to external formats</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium claude-text-primary mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: 'obsidian', label: '📝 Obsidian Markdown', color: 'blue' },
                { value: 'anki-csv', label: '🃏 Anki CSV', color: 'green' },
                { value: 'anki-html', label: '🃏 Anki HTML', color: 'purple' },
                { value: 'csv', label: '📊 Simple CSV', color: 'gray' }
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    format === value
                      ? `border-${color}-500 bg-${color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-sm claude-text-muted mt-1">
                    {getFormatDescription(value)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <div className="mb-6">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="claude-button-primary flex items-center gap-2"
              style={{background: 'linear-gradient(135deg, #6B5B4A 0%, #5A4A3A 100%)'}}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <DownloadIcon size={16} color="white" />
                  Export Deck
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 text-red-700">
                <ErrorIcon size={16} color="red" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Export Results */}
          {exportContent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium claude-text-primary">
                  Exported Content
                </h3>
                <button
                  id="copy-button"
                  onClick={copyToClipboard}
                  className="claude-button-secondary flex items-center gap-2"
                >
                  <CopyIcon size={16} color="default" />
                  Copy to Clipboard
                </button>
              </div>
              
              <textarea
                value={exportContent}
                readOnly
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none"
                placeholder="Exported content will appear here..."
              />
              
              <div className="text-sm claude-text-muted">
                <strong>Next steps:</strong> Copy the content above and paste it into your {format.includes('anki') ? 'Anki' : 'Obsidian'} application.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Import Modal Component  
const ImportModal = ({ deck, onClose, onSuccess }) => {
  const [importContent, setImportContent] = useState('');
  const [detectedFormat, setDetectedFormat] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [previewCards, setPreviewCards] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleContentChange = (content) => {
    setImportContent(content);
    setError('');
    
    if (content.trim()) {
      const format = ImportExportService.detectFormat(content);
      setDetectedFormat(format);
    } else {
      setDetectedFormat('');
      setPreviewCards([]);
      setShowPreview(false);
    }
  };

  const handlePreview = async () => {
    if (!importContent.trim()) {
      setError('Please paste some content first');
      return;
    }

    try {
      setError('');
      const result = await ImportExportService.importCards(importContent, detectedFormat);
      setPreviewCards(result.cards);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      setError(`Preview failed: ${error.message}`);
      setShowPreview(false);
    }
  };

  const handleImport = async () => {
    if (!previewCards.length) {
      setError('No cards to import. Please preview first.');
      return;
    }

    try {
      setIsImporting(true);
      setError('');

      // Import cards to the deck using DeckService
      const { DeckService } = await import('../services/deckService');
      const { FlashcardService } = await import('../services/flashcardService');
      
      for (const card of previewCards) {
        // Create the card in the cards collection
        const cardData = {
          statement: card.statement,
          hints: card.hints,
          proof: card.proof,
          tags: card.tags,
          subject: deck.subject || 'General',
          isPublic: false
        };
        
        const createdCard = await FlashcardService.createFlashcard(cardData);
        
        // Add card to the deck
        await DeckService.addCardToDeck(deck.id, createdCard.id);
      }

      onSuccess();
    } catch (error) {
      console.error('Import error:', error);
      setError(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const getFormatBadgeColor = (format) => {
    switch (format) {
      case 'obsidian': return 'blue';
      case 'anki-html': case 'anki-csv': return 'green';
      case 'csv': return 'purple';
      case 'simple': return 'gray';
      default: return 'red';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="claude-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UploadIcon size={24} color="green" />
              <div>
                <h2 className="text-2xl font-bold claude-text-primary">Import Cards</h2>
                <p className="claude-text-secondary">Import cards to "{deck.name}"</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Content Input */}
          <div>
            <label className="block text-sm font-medium claude-text-primary mb-2">
              Paste Your Cards
            </label>
            <textarea
              value={importContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Paste your flashcards here...

Examples:
- Obsidian: Statement :: Hint :: Proof
- Anki CSV: Front,Back,Tags
- Simple: One question per line, then answer on next line"
              className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none"
            />
          </div>

          {/* Format Detection */}
          {detectedFormat && (
            <div className="flex items-center gap-3">
              <span className="text-sm claude-text-secondary">Detected format:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${getFormatBadgeColor(detectedFormat)}-100 text-${getFormatBadgeColor(detectedFormat)}-700`}>
                {detectedFormat === 'obsidian' && '📝 Obsidian'}
                {detectedFormat === 'anki-html' && '🃏 Anki HTML'}
                {detectedFormat === 'anki-csv' && '🃏 Anki CSV'}
                {detectedFormat === 'csv' && '📊 CSV'}
                {detectedFormat === 'simple' && '📄 Simple Text'}
                {detectedFormat === 'unknown' && '❓ Unknown Format'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={!importContent.trim() || detectedFormat === 'unknown'}
              className="claude-button-secondary flex items-center gap-2"
            >
              👁️ Preview Cards
            </button>
            
            {showPreview && previewCards.length > 0 && (
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="claude-button-primary flex items-center gap-2"
                style={{background: 'linear-gradient(135deg, #6B5B4A 0%, #5A4A3A 100%)'}}
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadIcon size={16} color="white" />
                    Import {previewCards.length} Cards
                  </>
                )}
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 text-red-700">
                <ErrorIcon size={16} color="red" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Preview */}
          {showPreview && previewCards.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium claude-text-primary">
                Preview ({previewCards.length} cards)
              </h3>
              
              <div className="max-h-64 overflow-y-auto space-y-3 border border-gray-200 rounded-lg p-4">
                {previewCards.slice(0, 5).map((card, index) => (
                  <div key={index} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                    <div className="text-sm">
                      <div><strong>Statement:</strong> {card.statement || 'N/A'}</div>
                      {card.hints && <div><strong>Hint:</strong> {card.hints}</div>}
                      <div><strong>Proof:</strong> {card.proof || 'N/A'}</div>
                      {card.tags.length > 0 && <div><strong>Tags:</strong> {card.tags.join(', ')}</div>}
                    </div>
                  </div>
                ))}
                {previewCards.length > 5 && (
                  <div className="text-center text-sm claude-text-muted py-2">
                    ... and {previewCards.length - 5} more cards
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DeckCard = ({ deck, onEdit, onDelete, onSelect, onExport, onImport }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      className="claude-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer relative group"
      style={{borderLeft: `6px solid ${deck.color || '#6B5B4A'}`}}
      onClick={() => onSelect && onSelect()}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
            style={{backgroundColor: deck.color || '#6B5B4A'}}
          >
            {deck.icon ? (
              <span className="text-2xl">{deck.icon}</span>
            ) : (
              <BookIcon size={24} color="white" />
            )}
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
                onExport();
              }}
              className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 hover:text-blue-800"
              title="Export deck"
            >
              <DownloadIcon size={16} color="blue" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImport();
              }}
              className="p-2 rounded-lg hover:bg-green-100 text-green-600 hover:text-green-800"
              title="Import cards to deck"
            >
              <UploadIcon size={16} color="green" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800"
              title="Edit deck"
            >
              <EditIcon size={16} color="default" />
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
                <DeleteIcon size={16} color="red" />
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
                backgroundColor: `${deck.color || '#6B5B4A'}20`,
                color: deck.color || '#6B5B4A'
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
