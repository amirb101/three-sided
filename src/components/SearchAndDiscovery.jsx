import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMathJax } from '../hooks/useMathJax';
import { SearchIcon, ViewIcon, SaveIcon, HeartIcon } from './icons';
import { FlashcardService } from '../services/flashcardService';
import globalCache from '../services/cacheService';
// Fix hooks #310 - remove timestampToMillis from useMemo deps

const SearchAndDiscovery = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [allCards, setAllCards] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const [tagFilter, setTagFilter] = useState('');
  const [allTags, setAllTags] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [userUpvotes, setUserUpvotes] = useState(new Set());
  const [userImports, setUserImports] = useState(new Set());
  const [isUpvoting, setIsUpvoting] = useState(new Set());
  const [isImporting, setIsImporting] = useState(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const cardsPerPage = 12;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Utility functions
  const timestampToMillis = useCallback((timestamp) => {
    return timestamp?.toMillis ? timestamp.toMillis() : (timestamp || 0);
  }, []);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  // Track card view
  const trackCardView = useCallback(async (cardId) => {
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const trackView = httpsCallable(functions, 'trackCardView');
      await trackView({ cardId });
      
      // Update local card data
      setAllCards(prev => prev.map(card => 
        card.id === cardId 
          ? { ...card, viewCount: (card.viewCount || 0) + 1 }
          : card
      ));
    } catch (error) {
      console.error('Error tracking view:', error);
      // Don't show error to user as this is background tracking
    }
  }, []);

  // Handle view card in modal
  const handleViewCard = useCallback((card) => {
    setSelectedCard(card);
    setShowCardModal(true);
    trackCardView(card.id);
  }, [trackCardView]);

  // Render MathJax in modal when card changes
  useMathJax([selectedCard?.id], showCardModal);

  const loadFirestore = useCallback(async () => {
    const firestore = await import('firebase/firestore');
    const { db } = await import('../firebase');
    return { db, firestore };
  }, []);

  // Derive filtered and sorted cards with useMemo
  const filteredCards = useMemo(() => {
    const searchTerm = debouncedQuery.trim().toLowerCase();

    const filtered = allCards.filter(card => {
      // Handle hints as either array or string
      const hintsText = Array.isArray(card.hints) ? card.hints.join(' ') :
                        typeof card.hints === 'string' ? card.hints : '';
      
      const matchesSearch = !searchTerm ||
        (card.statement || '').toLowerCase().includes(searchTerm) ||
        hintsText.toLowerCase().includes(searchTerm) ||
        (card.proof || '').toLowerCase().includes(searchTerm) ||
        (card.authorSlug || '').toLowerCase().includes(searchTerm) ||
        (card.tags || []).some(tag => (tag || '').toLowerCase().includes(searchTerm));
      
      const matchesTag = !tagFilter || (card.tags || []).includes(tagFilter);
      
      return matchesSearch && matchesTag;
    });

    // Sort with robust timestamp handling
    switch (sortBy) {
      case 'upvotes':
        filtered.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        break;
      case 'oldest':
        filtered.sort((a, b) => timestampToMillis(a.createdAt) - timestampToMillis(b.createdAt));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => (a.statement || '').localeCompare(b.statement || ''));
        break;
      default: // 'recent'
        filtered.sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
    }

    return filtered;
  }, [allCards, debouncedQuery, sortBy, tagFilter]);

  // Render MathJax when results change
  useMathJax([filteredCards, currentPage]);

  useEffect(() => {
    loadPublicCards();
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      const [upvotes, imports] = await Promise.all([
        // Load user's upvotes - CACHED
        globalCache.getOrFetch(
          globalCache.userKey(user.uid, 'upvotes'),
          async () => {
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('../firebase');
            const snapshot = await getDocs(
              query(collection(db, 'userUpvotes'), where('userId', '==', user.uid))
            );
            return new Set(snapshot.docs.map(doc => doc.data().cardId));
          },
          'userUpvotes'
        ),
        
        // Load user's imports - CACHED
        globalCache.getOrFetch(
          globalCache.userKey(user.uid, 'imports'),
          async () => {
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('../firebase');
            const snapshot = await getDocs(
              query(collection(db, 'flashcards'), where('userId', '==', user.uid))
            );
            const importedStatements = new Set();
            snapshot.docs.forEach(doc => {
              importedStatements.add(doc.data().statement);
            });
            return importedStatements;
          },
          'userImports'
        )
      ]);
      
      setUserUpvotes(upvotes);
      setUserImports(imports);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [user]);

  const loadPublicCards = useCallback(async () => {
    try {
      setIsLoading(true);
      
      console.log('🔍 Loading public cards...');
      
      // Use cached FlashcardService instead of direct Firebase query
      const cards = await FlashcardService.getPublicFlashcards(200); // Increased limit
      
      // Extract all unique tags - CACHED
      const tagSet = await globalCache.getOrFetch(
        globalCache.publicKey('tags'),
        () => {
          const tags = new Set();
          cards.forEach(card => {
            if (card.tags && Array.isArray(card.tags)) {
              card.tags.forEach(tag => tags.add(tag));
            }
          });
          return tags;
        },
        'tags'
      );
      
      console.log('✅ Loaded public cards:', cards.length, cards.slice(0, 3));
      
      setAllCards(cards);
      setAllTags(tagSet);
    } catch (error) {
      console.error('❌ Error loading public cards:', error);
      setAllCards([]);
      setAllTags(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed since FlashcardService is cached

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, sortBy, tagFilter]);

  const handleUpvote = useCallback(async (cardId) => {
    if (!user) return; // Buttons will be disabled for guests
    
    if (isUpvoting.has(cardId)) {
      return; // Prevent double-clicks
    }

    setIsUpvoting(prev => new Set(prev).add(cardId));

    try {
      const { runTransaction, doc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const upvoteRef = doc(db, 'userUpvotes', `${user.uid}_${cardId}`);
      const cardRef = doc(db, 'publicCards', cardId);

      await runTransaction(db, async (tx) => {
        const upvoteSnap = await tx.get(upvoteRef);
        const cardSnap = await tx.get(cardRef);
        const current = cardSnap.data()?.likeCount || 0;

        if (upvoteSnap.exists()) {
          // Remove upvote
          tx.delete(upvoteRef);
          tx.update(cardRef, { likeCount: Math.max(0, current - 1) });
        } else {
          // Add upvote
          tx.set(upvoteRef, { userId: user.uid, cardId, createdAt: serverTimestamp() });
          tx.update(cardRef, { likeCount: current + 1 });
        }
      });

      // Update optimistic UI after successful transaction
      setUserUpvotes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cardId)) {
          newSet.delete(cardId);
        } else {
          newSet.add(cardId);
        }
        return newSet;
      });
      
      setAllCards(prev => prev.map(card => 
        card.id === cardId 
          ? { ...card, likeCount: Math.max(0, (card.likeCount || 0) + (userUpvotes.has(cardId) ? -1 : +1)) }
          : card
      ));
      
    } catch (error) {
      console.error('Error upvoting card:', error);
      setErrorMessage('Error upvoting card. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsUpvoting(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
    }
  }, [user, userUpvotes, isUpvoting, setAllCards]);

  const handleImport = useCallback(async (cardId) => {
    if (!user) return; // Buttons will be disabled for guests
    
    if (isImporting.has(cardId)) {
      return; // Prevent double-clicks
    }
    
    const card = allCards.find(c => c.id === cardId);
    if (!card) return; // nothing to import
    
    if (userImports.has(card.statement)) {
      setErrorMessage('Card already imported');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    setIsImporting(prev => new Set(prev).add(cardId));
    
    try {
      const { collection, addDoc, doc, updateDoc, increment } = await import('firebase/firestore');
      const { serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      // Add to user's flashcards
      await addDoc(collection(db, 'flashcards'), {
        userId: user.uid,
        statement: card.statement,
        hints: card.hints,
        proof: card.proof || '',
        tags: card.tags || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        importedFrom: cardId
      });
      
      // Increment import count
      await updateDoc(doc(db, 'publicCards', cardId), {
        importCount: increment(1)
      });
      
      const newImports = new Set(userImports);
      newImports.add(card.statement);
      setUserImports(newImports);
      
      // Update card in memory
      const updatedCards = allCards.map(c => 
        c.id === cardId 
          ? { ...c, importCount: (c.importCount || 0) + 1 }
          : c
      );
      setAllCards(updatedCards);
      
      setErrorMessage('Card imported successfully!');
      setTimeout(() => setErrorMessage(''), 3000);
      
    } catch (error) {
      console.error('Error importing card:', error);
      setErrorMessage('Error importing card. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsImporting(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
    }
  }, [user, allCards, userImports, loadFirestore, isImporting]);

  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };


  const renderCard = (card) => {
    const isUpvoted = user && userUpvotes.has(card.id);
    const isImported = user && userImports.has(card.statement);
    const isUpvotingCard = isUpvoting.has(card.id);
    const isImportingCard = isImporting.has(card.id);
    const dateStr = formatDate(card.createdAt);
    const authorInitial = card.authorSlug ? card.authorSlug.charAt(0).toUpperCase() : 'U';

    return (
      <div key={card.id} className="claude-card p-6 hover:shadow-lg transition-all duration-200">
        {/* Author info */}
        <div className="flex items-center gap-2 mb-4">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
            style={{background: 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)'}}
          >
            {authorInitial}
          </div>
          <div>
            {card.authorSlug ? (
              <a 
                href={`/profile/${card.authorSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
                style={{color: '#9B8B73'}}
              >
                {card.authorSlug}
              </a>
            ) : (
              <span className="font-medium claude-text-secondary">
                Anonymous User
              </span>
            )}
            <div className="claude-text-muted text-sm">{dateStr}</div>
          </div>
        </div>

        {/* Statement */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>Statement</h3>
          <div 
            className="text-sm leading-relaxed"
            style={{color: 'var(--claude-primary-text)'}}
            dangerouslySetInnerHTML={{ __html: escapeHtml(card.statement) }}
          />
        </div>

        {/* Hints */}
        {card.hints && (
          <div className="mb-4">
            <h4 className="font-medium mb-1 claude-text-secondary text-sm">Hints</h4>
            <div 
              className="text-sm claude-text-secondary"
              dangerouslySetInnerHTML={{ __html: escapeHtml(card.hints) }}
            />
          </div>
        )}

        {/* Proof Preview */}
        {card.proof && (
          <div className="mb-4 p-3 rounded-lg" style={{backgroundColor: 'var(--claude-subtle)', borderLeft: '4px solid #9B8B73'}}>
            <div className="text-xs font-semibold claude-text-secondary mb-1 uppercase tracking-wider">
              Proof Preview
            </div>
            <div 
              className="text-sm"
              style={{color: 'var(--claude-primary-text)'}}
              dangerouslySetInnerHTML={{ 
                __html: escapeHtml(card.proof.substring(0, 150) + (card.proof.length > 150 ? '...' : ''))
              }}
            />
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm claude-text-muted">
          <div className="flex items-center gap-1">
            <ViewIcon size={16} color="default" />
            <span>{Math.max(0, card.viewCount || 0)} views</span>
          </div>
          <div className="flex items-center gap-1">
            <SaveIcon size={16} color="default" />
            <span>{Math.max(0, card.importCount || 0)} imports</span>
          </div>
        </div>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {card.tags.map(tag => (
              <span 
                key={tag}
                className="cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: 'rgba(155, 139, 115, 0.1)',
                  color: '#9B8B73',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}
                onClick={() => setTagFilter(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 items-center">
          <button
            onClick={() => handleUpvote(card.id)}
            disabled={!user || isUpvotingCard}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isUpvoted 
                ? 'text-white' 
                : 'claude-button-secondary'
            } ${(!user || isUpvotingCard) ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              backgroundColor: isUpvoted ? 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)' : undefined,
              border: isUpvoted ? 'none' : undefined
            }}
            title={!user ? 'Sign in to upvote cards' : `${isUpvoted ? 'Remove upvote from' : 'Upvote'} this flashcard`}
            aria-label={!user ? 'Sign in to upvote cards' : `${isUpvoted ? 'Remove upvote from' : 'Upvote'} this flashcard`}
          >
            {isUpvotingCard ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <HeartIcon size={16} color={isUpvoted ? "white" : "default"} />
            )}
            {Math.max(0, card.likeCount || 0)}
          </button>
          
          <button
            onClick={() => handleImport(card.id)}
            disabled={!user || isImported || isImportingCard}
            className={`text-sm flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${(!user || isImported || isImportingCard) ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              background: isImported ? 'var(--claude-success)' : 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)',
              color: 'white'
            }}
            title={!user ? 'Sign in to import cards' : isImported ? 'Card already imported' : 'Import this flashcard to your collection'}
            aria-label={!user ? 'Sign in to import cards' : isImported ? 'Card already imported' : 'Import this flashcard to your collection'}
          >
            <SaveIcon size={16} color="white" />
            {isImportingCard ? 'Importing...' : isImported ? 'Imported' : 'Import'}
          </button>
          
          <button
            onClick={() => handleViewCard(card)}
            className="claude-button-secondary text-sm flex items-center gap-2"
          >
            <ViewIcon size={16} color="default" />
            View
          </button>
          
          <a
            href={`/card/${card.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="claude-button-secondary text-sm flex items-center gap-2"
            onClick={() => trackCardView(card.id)}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
              <path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
            </svg>
            Share
          </a>
        </div>
      </div>
    );
  };

  // Pagination
  const totalPages = Math.ceil(filteredCards.length / cardsPerPage);
  const startIndex = (currentPage - 1) * cardsPerPage;
  const endIndex = startIndex + cardsPerPage;
  const currentCards = filteredCards.slice(startIndex, endIndex);

  const changePage = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [totalPages]);

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white shadow-lg" style={{background: 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)'}}>
              <SearchIcon size={32} color="white" />
            </div>
            <h1 className="text-4xl font-extrabold" style={{color: 'var(--claude-heading)'}}>
              Search Flashcards
            </h1>
          </div>
          <p className="claude-text-secondary text-lg">
            Discover and import flashcards from the community
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className={`mb-6 p-4 rounded-lg border ${
            errorMessage.includes('successfully') 
              ? 'border-green-200 bg-green-50 text-green-800' 
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <span>{errorMessage}</span>
              <button 
                onClick={() => setErrorMessage('')}
                className="ml-2 text-lg font-bold opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Auth Notice */}
        {!user && (
          <div className="text-center p-4 mb-6 rounded-2xl" style={{
            background: 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)',
            color: 'white'
          }}>
            <p className="mb-3">Unlock the full experience!</p>
            <a 
              href="/index.html"
              className="inline-block px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              Sign in
            </a>
            <span> to upvote and import flashcards to your account.</span>
          </div>
        )}

        {/* Search Controls */}
        <div className="claude-card p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <SearchIcon size={16} color="default" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search flashcards, tags, or authors..."
                className="claude-input w-full pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center claude-text-muted hover:opacity-70"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="claude-input"
              >
                <option value="recent">Most Recent</option>
                <option value="upvotes">Most Upvoted</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">Alphabetical</option>
              </select>

              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="claude-input"
              >
                <option value="">All Tags</option>
                {Array.from(allTags).sort().map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        {filteredCards.length > 0 && (
          <div className="claude-card p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="claude-text-secondary">
                <span className="font-semibold">{filteredCards.length}</span> flashcards found
              </div>
              <div className="claude-text-muted text-sm">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredCards.length)} of {filteredCards.length}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-t-4 rounded-full animate-spin mx-auto mb-4" style={{
              borderColor: 'var(--claude-border)',
              borderTopColor: '#9B8B73'
            }}></div>
            <div className="claude-text-secondary">Loading flashcards...</div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredCards.length === 0 && (
          <div className="text-center py-12">
            <SearchIcon size={64} color="default" className="mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>
              No flashcards found
            </h3>
            <p className="claude-text-muted">Try adjusting your search terms or filters</p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && currentCards.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {currentCards.map(renderCard)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="claude-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => changePage(page)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    page === currentPage 
                      ? 'text-white' 
                      : 'claude-button-secondary'
                  }`}
                  style={{
                    backgroundColor: page === currentPage ? '#9B8B73' : undefined
                  }}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="claude-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Card Modal */}
      {showCardModal && selectedCard && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" 
          style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}
          onClick={() => setShowCardModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-4xl w-[90%] max-h-[80vh] overflow-y-auto m-4 relative"
            onClick={(e) => e.stopPropagation()}
            style={{color: 'var(--claude-primary-text)', backgroundColor: 'var(--claude-surface)'}}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowCardModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              style={{color: 'var(--claude-muted-text)'}}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>

            {/* Card Content */}
            <div className="pr-8">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{background: 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)'}}>
                    {selectedCard.authorSlug ? selectedCard.authorSlug.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <a 
                      href={`/profile/${selectedCard.authorSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                      style={{color: '#9B8B73'}}
                    >
                      {selectedCard.authorSlug}
                    </a>
                    <div className="text-sm claude-text-muted">
                      {formatDate(selectedCard.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statement */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>Statement</h3>
                <div 
                  className="p-4 rounded-lg" 
                  style={{backgroundColor: 'var(--claude-subtle)', border: '1px solid var(--claude-border)'}}
                  dangerouslySetInnerHTML={{ __html: selectedCard.statement }}
                />
              </div>

              {/* Hints */}
              {selectedCard.hints && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>Hints</h3>
                  <div 
                    className="p-4 rounded-lg"
                    style={{backgroundColor: 'var(--claude-subtle)', border: '1px solid var(--claude-border)'}}
                    dangerouslySetInnerHTML={{ __html: selectedCard.hints }}
                  />
                </div>
              )}

              {/* Proof */}
              {selectedCard.proof && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>Proof / Answer</h3>
                  <div 
                    className="p-4 rounded-lg"
                    style={{backgroundColor: 'var(--claude-subtle)', border: '1px solid var(--claude-border)'}}
                    dangerouslySetInnerHTML={{ __html: selectedCard.proof }}
                  />
                </div>
              )}

              {/* Tags */}
              {selectedCard.tags && selectedCard.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCard.tags.map(tag => (
                      <span
                        key={tag}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: 'rgba(155, 139, 115, 0.1)',
                          color: '#9B8B73',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}
                        onClick={() => {
                          setTagFilter(tag);
                          setShowCardModal(false);
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-4 mb-6 text-sm claude-text-muted">
                <div className="flex items-center gap-1">
                  <ViewIcon size={16} color="default" />
                  <span>{Math.max(0, selectedCard.viewCount || 0)} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <SaveIcon size={16} color="default" />
                  <span>{Math.max(0, selectedCard.importCount || 0)} imports</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t" style={{borderColor: 'var(--claude-border)'}}>
                <button
                  onClick={() => {
                    handleUpvote(selectedCard.id);
                  }}
                  disabled={!user || isUpvoting.has(selectedCard.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    userUpvotes.has(selectedCard.id) 
                      ? 'text-white' 
                      : 'claude-button-secondary'
                  } ${(!user || isUpvoting.has(selectedCard.id)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: userUpvotes.has(selectedCard.id) ? 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)' : undefined,
                    border: userUpvotes.has(selectedCard.id) ? 'none' : undefined
                  }}
                >
                  {isUpvoting.has(selectedCard.id) ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <HeartIcon size={16} color={userUpvotes.has(selectedCard.id) ? "white" : "default"} />
                  )}
                  {Math.max(0, selectedCard.likeCount || 0)}
                </button>
                
                <button
                  onClick={() => {
                    handleImport(selectedCard.id);
                    setShowCardModal(false);
                  }}
                  disabled={!user || userImports.has(selectedCard.statement) || isImporting.has(selectedCard.id)}
                  className={`text-sm flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${(!user || userImports.has(selectedCard.statement) || isImporting.has(selectedCard.id)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{
                    background: userImports.has(selectedCard.statement) ? 'var(--claude-success)' : 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)',
                    color: 'white'
                  }}
                >
                  <SaveIcon size={16} color="white" />
                  {isImporting.has(selectedCard.id) ? 'Importing...' : userImports.has(selectedCard.statement) ? 'Imported' : 'Import'}
                </button>

                <a
                  href={`/card/${selectedCard.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="claude-button-secondary text-sm flex items-center gap-2"
                  onClick={() => trackCardView(selectedCard.id)}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                    <path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                  </svg>
                  Share
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAndDiscovery;