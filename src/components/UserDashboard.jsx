import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserService } from '../services/userService';
import { FlashcardService } from '../services/flashcardService';
import { DeckService } from '../services/deckService';
import { useAuth } from '../contexts/AuthContext';
import PublicFlashcardManager from './PublicFlashcardManager';
import { useMathJax } from '../hooks/useMathJax';

// Helper functions
const debug = (...args) => process.env.NODE_ENV !== 'production' && console.log(...args);

const toDateSafe = (tsOrMs) => {
  if (!tsOrMs) return null;
  if (typeof tsOrMs?.toDate === 'function') return tsOrMs.toDate();
  const d = new Date(tsOrMs);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeCard = (raw, i = 0) => ({
  id: raw.id ?? `card-${i}`,
  subject: raw.subject ?? 'General',
  question: raw.question ?? raw.statement ?? '',
  answer: raw.answer ?? raw.proof ?? '',
  createdAt: toDateSafe(raw.createdAt) ?? new Date(0),
  ...raw,
});

const preview = (s, n) => (typeof s === 'string' ? (s.length > n ? s.slice(0, n) + '…' : s) : '');

const UserDashboard = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [userFlashcards, setUserFlashcards] = useState([]);
  const [importedCards, setImportedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [inspectedCard, setInspectedCard] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [publicManagerOpen, setPublicManagerOpen] = useState(false);
  const [deckMoveCard, setDeckMoveCard] = useState(null);
  const [userDecks, setUserDecks] = useState([]);
  const [showDeckSelector, setShowDeckSelector] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      setUserFlashcards([]);
      setImportedCards([]);
      setIsLoading(false);
      return;
    }
    loadUserData();
  }, [user?.uid]);

  const loadUserData = useCallback(async () => {
    let mounted = true;
    setIsLoading(true);
    setActiveTab(prev => prev); // no-op, but keeps React strict-mode happy

    try {
      const uid = user.uid;
      debug('🔍 Loading user data for:', uid);
      
      const tasks = [
        UserService.getUserProfile(uid),
        (async () => {
          try {
            // Load from new 'cards' collection
            const newCards = await FlashcardService.getUserFlashcards(uid, 100);
            
            // Also load from legacy 'flashcards' collection
            const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
            const { db } = await import('../firebase');
            const legacyQuery = query(
              collection(db, 'flashcards'),
              where('userId', '==', uid),
              orderBy('createdAt', 'desc'),
              limit(100)
            );
            const legacySnap = await getDocs(legacyQuery);
            const legacyCards = legacySnap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Merge both collections, newest first
            const allCards = [...newCards, ...legacyCards].sort((a, b) => {
              const aDate = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
              const bDate = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
              return bDate - aDate;
            });
            
            return allCards;
          } catch (error) {
            debug('Failed to load user cards:', error);
            return [];
          }
        })(),
        (async () => {
          try {
            // Get imported cards by finding user's private cards that have originalCardId
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('../firebase');
            const importedQuery = query(
              collection(db, 'cards'),
              where('userId', '==', uid),
              where('originalCardId', '!=', null)
            );
            const importedSnap = await getDocs(importedQuery);
            return importedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch (error) {
            debug('Failed to load imported cards:', error);
            return [];
          }
        })(),
      ];

      const [pRes, cardsRes, importedRes] = await Promise.allSettled(tasks);

      if (!mounted) return;

      const profile = pRes.status === 'fulfilled' ? pRes.value : null;
      const rawCards = cardsRes.status === 'fulfilled' ? (cardsRes.value ?? []) : [];
      const normalizedCards = rawCards.map(normalizeCard);
      const importedCardsData = importedRes.status === 'fulfilled' ? (importedRes.value ?? []) : [];

      debug('👤 User profile:', profile);
      debug('📝 Private cards found:', normalizedCards.length);
      debug('📥 Imported cards found:', importedCardsData.length);

      setUserProfile(profile);
      setUserFlashcards(normalizedCards);
      setImportedCards(importedCardsData);
    } catch (err) {
      console.error('💥 Error loading user data:', err);
    } finally {
      if (mounted) setIsLoading(false);
    }

    return () => { mounted = false; };
  }, [user?.uid]);

  const deleteCard = async (cardId) => {
    if (!confirm('Delete this card? This cannot be undone.')) return;
    const prev = userFlashcards;
    setUserFlashcards(prev => prev.filter(c => c.id !== cardId));
    try {
      await FlashcardService.deleteFlashcard(cardId);
    } catch (e) {
      console.error('Error deleting card:', e);
      // rollback
      setUserFlashcards(prev);
    }
  };

  // Load user decks for deck management
  const loadUserDecks = useCallback(async () => {
    try {
      if (!user?.uid) return;
      const decks = await DeckService.getUserDecks(user.uid, true);
      setUserDecks(decks);
    } catch (error) {
      console.error('Error loading user decks:', error);
    }
  }, [user?.uid]);

  // Load decks when user changes
  useEffect(() => {
    loadUserDecks();
  }, [loadUserDecks]);

  // Show deck move options for a card
  const showDeckMoveOptions = (card) => {
    setDeckMoveCard(card);
    setShowDeckSelector(true);
  };

  // Move card to a different deck
  const moveCardToDeck = async (deckId) => {
    if (!deckMoveCard) return;
    
    try {
      // Add card to the new deck
      await DeckService.addCardToDeck(deckId, deckMoveCard.id);
      
      // Update the card's deckIds in the cards collection
      await FlashcardService.updateCardDeck(deckMoveCard.id, deckId);
      
      setShowDeckSelector(false);
      setDeckMoveCard(null);
      
      // Refresh data
      await loadUserData();
    } catch (error) {
      console.error('Error moving card to deck:', error);
      alert('Failed to move card. Please try again.');
    }
  };

  const refresh = async () => { 
    setRefreshing(true); 
    await loadUserData(); 
    setRefreshing(false); 
  };

  const openCardInspector = useCallback((card) => {
    setInspectedCard(card);
    setInspectorOpen(true);
  }, []);

  const closeCardInspector = useCallback(() => {
    setInspectorOpen(false);
    setInspectedCard(null);
  }, []);

  // Render MathJax when inspector content changes
  useMathJax([inspectedCard]);

  // Memoized computations - safe with empty array
  const subjectCount = useMemo(() => {
    if (!userFlashcards || userFlashcards.length === 0) return 0;
    const s = new Set(userFlashcards.map(c => (c.subject ?? 'General')));
    return s.size;
  }, [userFlashcards]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="claude-card p-12 text-center max-w-lg">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto mb-6" style={{borderColor: 'var(--claude-accent)', borderTopColor: 'transparent'}}></div>
          <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>Loading Dashboard...</h3>
          <p className="claude-text-secondary">Fetching your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold mb-4" style={{color: 'var(--claude-heading)'}}>
            🎯 Your Dashboard
          </h1>
          <p className="claude-text-secondary text-lg">Welcome back, {user?.displayName || 'Student'}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="claude-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <span className="text-2xl">📚</span>
              </div>
              <span className="claude-text-muted text-sm">Total</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{userFlashcards.length}</div>
            <div className="claude-text-secondary text-sm">Flashcards Created</div>
          </div>

          <div className="claude-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <span className="text-2xl">📥</span>
              </div>
              <span className="claude-text-muted text-sm">Imported</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{importedCards.length}</div>
            <div className="claude-text-secondary text-sm">Imported</div>
          </div>

          <div className="claude-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <span className="text-2xl">🔥</span>
              </div>
              <span className="claude-text-muted text-sm">Streak</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{userProfile?.loginStreak || 0}</div>
            <div className="claude-text-secondary text-sm">Day Streak</div>
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Dashboard sections"
          className="flex claude-card rounded-2xl p-2 mb-8"
        >
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'profile', label: 'My Profile', icon: '👤' },
            { id: 'cards', label: 'My Cards', icon: '📚' },
            { id: 'public', label: 'Public Cards', icon: '📢' },
            { id: 'imported', label: 'Imported Cards', icon: '📥' }
          ].map((tab, idx) => {
            const tabs = [
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'profile', label: 'My Profile', icon: '👤' },
              { id: 'cards', label: 'My Cards', icon: '📚' },
              { id: 'public', label: 'Public Cards', icon: '📢' },
              { id: 'imported', label: 'Imported Cards', icon: '📥' }
            ];
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={selected}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
                tabIndex={selected ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') setActiveTab(tabs[(idx + 1) % tabs.length].id);
                  if (e.key === 'ArrowLeft') setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length].id);
                }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selected
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'claude-text-secondary hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div role="tabpanel" id="overview-panel" aria-labelledby="overview-tab" className="space-y-8">
            {/* Recent Activity */}
            <div className="claude-card rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">📈 Recent Activity</h2>
              <div className="space-y-4">
                {userFlashcards.slice(0, 5).map((card) => (
                  <div key={card.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                    <div>
                      <h3 className="text-white font-medium">{card.question?.slice(0, 60)}...</h3>
                      <p className="claude-text-muted text-sm">Created {new Date(card.createdAt?.toDate?.() || card.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-blue-400 text-sm">{card.subject || 'General'}</span>
                  </div>
                ))}
                {userFlashcards.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-xl font-semibold claude-text-secondary mb-2">No cards yet</h3>
                    <p className="claude-text-muted">Create your first flashcard to get started!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="claude-card rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">📊 Quick Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">{userFlashcards.length}</div>
                  <div className="claude-text-secondary text-sm">Total Cards</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">{importedCards.length}</div>
                  <div className="claude-text-secondary text-sm">Imported Cards</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">{subjectCount}</div>
                  <div className="claude-text-secondary text-sm">Subjects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">{userProfile?.loginStreak || 0}</div>
                  <div className="claude-text-secondary text-sm">Day Streak</div>
                </div>
              </div>
            </div>
          </div>
        )        }

        {activeTab === 'profile' && (
          <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab" className="claude-card rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--claude-heading)'}}>👤 My Profile</h2>
            
            {userProfile ? (
              <div className="space-y-6">
                {/* Profile Info Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium claude-text-secondary mb-2">Display Name</label>
                    <div className="claude-card p-4 rounded-xl">
                      <span className="claude-text-primary">{userProfile.displayName || 'Not set'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium claude-text-secondary mb-2">Profile URL</label>
                    <div className="claude-card p-4 rounded-xl">
                      <a 
                        href={`/profile/${userProfile.slug}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        three-sided.com/profile/{userProfile.slug}
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium claude-text-secondary mb-2">Bio</label>
                  <div className="claude-card p-4 rounded-xl">
                    <span className="claude-text-primary">{userProfile.bio || 'No bio added yet'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium claude-text-secondary mb-2">Institution</label>
                  <div className="claude-card p-4 rounded-xl">
                    <span className="claude-text-primary">{userProfile.institution || 'Not specified'}</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      // TODO: Add edit profile functionality
                      console.log('Edit profile');
                    }}
                    className="claude-button-primary"
                  >
                    ✏️ Edit Profile
                  </button>
                  <a
                    href={`/profile/${userProfile.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="claude-button-secondary"
                  >
                    👁️ View Public Profile
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-xl font-semibold claude-text-secondary mb-2">No profile yet</h3>
                <p className="claude-text-muted mb-6">Create a profile to share your flashcards publicly and connect with other students.</p>
                <button
                  onClick={() => {
                    // TODO: Navigate to profile creation
                    console.log('Create profile');
                  }}
                  className="claude-button-primary"
                >
                  🚀 Create My Profile
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cards' && (
          <div role="tabpanel" id="cards-panel" aria-labelledby="cards-tab" className="claude-card rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">📚 My Cards ({userFlashcards.length})</h2>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg transition-all duration-200"
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            
            {userFlashcards.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold claude-text-secondary mb-2">No cards found</h3>
                <p className="claude-text-muted mb-6">It looks like you haven't created any flashcards yet, or there might be a connection issue.</p>
                <div className="space-x-4">
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); window.location.href = '/#create'; }}
                    className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200"
                  >
                    Create a Flashcard
                  </a>
                  <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    {refreshing ? 'Refreshing…' : 'Try Loading Again'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userFlashcards.map((card) => (
                  <div key={card.id} className="group claude-card border hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-sm text-blue-400 font-medium">{card.subject || 'General'}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={() => showDeckMoveOptions(card)}
                          className="text-purple-400 hover:text-purple-300 text-sm px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20"
                          title="Move to deck"
                        >
                          📁
                        </button>
                        <button
                          onClick={() => deleteCard(card.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete card"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-white mb-3 group-hover:text-blue-300 transition-colors">
                      {preview(card.question, 80)}
                    </h3>
                    
                    <p className="claude-text-secondary text-sm mb-4 leading-relaxed">
                      {preview(card.answer, 100)}
                    </p>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="claude-text-muted">
                        {toDateSafe(card.createdAt)?.toLocaleDateString() ?? '—'}
                      </span>
                      <div className="flex gap-2">
                        {card.slug ? (
                          <a 
                            href={`/card/${card.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                          >
                            View Public →
                          </a>
                        ) : (
                          <button
                            onClick={() => openCardInspector(card)}
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
                          >
                            🔍 Inspect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'public' && (
          <div role="tabpanel" id="public-panel" aria-labelledby="public-tab" className="claude-card rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">📢 Your Public Cards</h2>
              <button
                onClick={() => setPublicManagerOpen(true)}
                className="claude-button-primary"
              >
                📋 Manage Public Cards
              </button>
            </div>
            
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📢</div>
              <h3 className="text-xl font-semibold text-white mb-2">Public Flashcard Management</h3>
              <p className="claude-text-muted mb-6">
                View, edit, and manage all your public flashcards in one place. 
                Control what the world sees and track engagement.
              </p>
              <button
                onClick={() => setPublicManagerOpen(true)}
                className="claude-button-primary"
              >
                Open Public Card Manager
              </button>
            </div>
          </div>
        )}

        {activeTab === 'imported' && (
          <div role="tabpanel" id="imported-panel" aria-labelledby="imported-tab" className="claude-card rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">📥 Imported Cards ({importedCards.length})</h2>
            
            {importedCards.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold claude-text-secondary mb-2">No imported cards yet</h3>
                <p className="claude-text-muted">Import useful cards from the public library!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {importedCards.map((card) => (
                  <div key={card.id} className="group claude-card border hover:border-purple-500/50 rounded-2xl p-6 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-sm text-purple-400 font-medium">{card.subject || 'General'}</span>
                      <span className="text-blue-400">📥</span>
                    </div>
                    
                    <h3 className="font-semibold text-white mb-3 group-hover:text-purple-300 transition-colors">
                      {card.question?.length > 80 ? card.question.slice(0, 80) + '...' : card.question}
                    </h3>
                    
                    <p className="claude-text-secondary text-sm leading-relaxed">
                      {card.answer?.length > 100 ? card.answer.slice(0, 100) + '...' : card.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Inspector Modal */}
      {inspectorOpen && inspectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="claude-card rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-300 flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{color: 'var(--claude-heading)'}}>Card Inspector</h2>
              <button
                onClick={closeCardInspector}
                className="claude-text-muted hover:text-gray-700 text-2xl transition-colors"
                aria-label="Close inspector"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Subject & Created Date */}
              <div className="flex gap-4 mb-6">
                <span className="claude-tag">
                  {inspectedCard.subject || 'General'}
                </span>
                <span className="claude-text-muted text-sm">
                  Created: {toDateSafe(inspectedCard.createdAt)?.toLocaleDateString() ?? 'Unknown'}
                </span>
              </div>

              {/* Statement/Question */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-purple-400 mb-3">Statement</h3>
                <div className="claude-card rounded-xl p-4 leading-relaxed claude-text-primary">
                  {inspectedCard.statement || inspectedCard.question || 'No statement available'}
                </div>
              </div>

              {/* Hints */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">Hints</h3>
                <div className="claude-card rounded-xl p-4 leading-relaxed claude-text-primary">
                  {Array.isArray(inspectedCard.hints) 
                    ? inspectedCard.hints.join('\n') 
                    : (inspectedCard.hints || inspectedCard.hint || 'No hints available')
                  }
                </div>
              </div>

              {/* Proof/Answer */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-green-400 mb-3">Proof</h3>
                <div className="claude-card rounded-xl p-4 leading-relaxed claude-text-primary">
                  {inspectedCard.proof || inspectedCard.answer || 'No proof available'}
                </div>
              </div>

              {/* Tags */}
              {inspectedCard.tags && inspectedCard.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-orange-400 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {inspectedCard.tags.map((tag, index) => (
                      <span key={index} className="claude-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-300">
                <button
                  onClick={() => {
                    // TODO: Add edit functionality
                    console.log('Edit card:', inspectedCard.id);
                  }}
                  className="claude-button-secondary"
                >
                  ✏️ Edit Card
                </button>
                <button
                  onClick={async () => {
                    await deleteCard(inspectedCard.id);
                    closeCardInspector();
                  }}
                  className="claude-button-danger"
                >
                  🗑️ Delete Card
                </button>
                <button
                  onClick={closeCardInspector}
                  className="claude-button-primary ml-auto"
                >
                  ✓ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Public Flashcard Manager */}
      {publicManagerOpen && (
        <PublicFlashcardManager
          onClose={() => setPublicManagerOpen(false)}
          refreshCallback={loadUserData}
        />
      )}

      {/* Deck Selector Modal */}
      {showDeckSelector && deckMoveCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="claude-card max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Move Card to Deck</h3>
              <button
                onClick={() => setShowDeckSelector(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="claude-text-secondary mb-2">Moving card:</p>
              <p className="text-white font-medium truncate">
                {deckMoveCard.statement || deckMoveCard.question || 'Untitled Card'}
              </p>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {userDecks.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => moveCardToDeck(deck.id)}
                  className="w-full text-left p-3 rounded-lg border border-gray-600 hover:border-purple-500 hover:bg-purple-500/10 transition-all duration-200"
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
              
              {userDecks.length === 0 && (
                <div className="text-center py-8">
                  <p className="claude-text-secondary">No decks available</p>
                  <p className="text-sm claude-text-muted mt-2">Create a deck first to organize your cards</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-600">
              <button
                onClick={() => setShowDeckSelector(false)}
                className="claude-button-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;