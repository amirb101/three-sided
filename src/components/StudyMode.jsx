import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FlashcardService } from '../services/flashcardService';
import { AnalyticsService } from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';
import { useMathJax } from '../hooks/useMathJax';
import { BookIcon, TargetIcon, ErrorIcon, WarningIcon, SuccessIcon, FastIcon } from './icons';
// Force rebuild: hooks violation fix v6 - moved ALL hooks to top before conditional returns

const StudyMode = () => {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSide, setCurrentSide] = useState(0); // 0=statement, 1=hint, 2=proof
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [studySession, setStudySession] = useState(null);
  const [cardStartTime, setCardStartTime] = useState(null);
  const [showAccuracyTracking, setShowAccuracyTracking] = useState(false);
  const [cardAccuracy, setCardAccuracy] = useState({});
  const touchStartX = useRef(null);
  const touchMoved = useRef(false);
  const cardRef = useRef(null);

  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  
  // All hooks must be called unconditionally at the top level
  const currentCard = flashcards[currentIndex];
  
  // Memoized side content with proper hints normalization - use primitive dependencies
  const sideContent = useMemo(() => {
    const stmt = currentCard?.statement ?? currentCard?.question ?? 'No statement available';
    const hints = Array.isArray(currentCard?.hints)
      ? currentCard.hints.join('\n')
      : (currentCard?.hints ?? currentCard?.hint ?? 'No hint available');
    const proof = currentCard?.proof ?? currentCard?.answer ?? 'No proof available';
    return [stmt, hints, proof];
  }, [
    currentCard?.statement,
    currentCard?.question,
    currentCard?.hints,
    currentCard?.hint,
    currentCard?.proof,
    currentCard?.answer
  ]);

  const sideLabels = ['Statement', 'Hint', 'Proof'];

  // Render MathJax scoped to card when content changes
  useMathJax([currentIndex, currentSide], cardRef?.current);

  useEffect(() => {
    loadFlashcards();
  }, [user]);

  // Start study session when component mounts and flashcards are loaded
  useEffect(() => {
    if (user && flashcards.length > 0 && !studySession) {
      startStudySession();
    }
  }, [user, flashcards.length, studySession]);

  // Track card viewing time
  useEffect(() => {
    if (currentCard) {
      setCardStartTime(Date.now());
    }
  }, [currentIndex]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (studySession) {
        endStudySession();
      }
    };
  }, [studySession]);

  // Session management functions
  const startStudySession = async () => {
    try {
      const session = await AnalyticsService.startStudySession(user.uid, {
        mode: 'study',
        deckId: null, // All cards for now
        deckName: 'All Cards'
      });
      setStudySession(session);
      console.log('Study session started:', session.sessionId);
    } catch (error) {
      console.error('Failed to start study session:', error);
    }
  };

  const endStudySession = async () => {
    if (!studySession) return;
    
    try {
      const sessionStats = await AnalyticsService.endStudySession(studySession.sessionId, user.uid);
      console.log('Study session ended:', sessionStats);
      setStudySession(null);
    } catch (error) {
      console.warn('Analytics not available for session end:', error);
      setStudySession(null); // Still clear the session locally
    }
  };

  const recordCardAnswer = async (wasCorrect, confidenceLevel = 3) => {
    if (!studySession || !currentCard || !cardStartTime) return;
    
    const timeSpent = Math.round((Date.now() - cardStartTime) / 1000); // seconds
    
    try {
      await AnalyticsService.recordCardAnswer(studySession.sessionId, {
        cardId: currentCard.id,
        userId: user.uid,
        timeSpent,
        wasCorrect,
        attempts: 1,
        difficulty: 'medium', // Could be enhanced based on card data
        confidenceLevel
      });
      
      // Update local accuracy tracking
      setCardAccuracy(prev => ({
        ...prev,
        [currentCard.id]: wasCorrect
      }));
      
      // Automatically advance to next card after a short delay
      setTimeout(() => {
        nextCard();
      }, 1000);
      
    } catch (error) {
      console.warn('Analytics not available, but rating recorded locally:', error);
      // Still update local tracking even if analytics fails
      setCardAccuracy(prev => ({
        ...prev,
        [currentCard.id]: wasCorrect
      }));
      
      // Still advance to next card
      setTimeout(() => {
        nextCard();
      }, 1000);
    }
  };

  const loadFlashcards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      let cards = [];
      
      // If user is logged in, try to load their cards from both collections
      if (user) {
        try {
          // Load from new 'cards' collection
          const newCards = await FlashcardService.getUserFlashcards(user.uid, 50);
          
          // Also load from legacy 'flashcards' collection
          const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          const legacyQuery = query(
            collection(db, 'flashcards'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          const legacySnap = await getDocs(legacyQuery);
          const legacyCards = legacySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Merge both collections, newest first
          cards = [...newCards, ...legacyCards].sort((a, b) => {
            const aDate = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
            const bDate = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
            return bDate - aDate;
          });
          
        } catch (e) {
          console.warn('Failed to load user cards, falling back to public:', e);
        }
      }
      
      // If no user cards or user not logged in, load public cards
      if (!cards.length) {
        cards = await FlashcardService.getPublicFlashcards(50);
      }
      
      // Ensure cards is an array and validate data
      if (Array.isArray(cards) && cards.length > 0) {
        setFlashcards(cards);
        setCurrentIndex(0);
        setCurrentSide(0);
      } else {
        setFlashcards([]);
        setCurrentIndex(0);
        setCurrentSide(0);
      }
    } catch (e) {
      setError('Failed to load flashcards');
      console.error('Error loading flashcards:', e);
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const nextCard = useCallback(() => {
    if (flashcards.length > 0) {
      setCurrentIndex(i => Math.min(i + 1, flashcards.length - 1));
      setCurrentSide(0);
    }
  }, [flashcards.length]);

  const prevCard = useCallback(() => {
    if (flashcards.length > 0) {
      setCurrentIndex(i => Math.max(i - 1, 0));
      setCurrentSide(0);
    }
  }, [flashcards.length]);

  const nextSide = useCallback(() => {
    setCurrentSide(s => (s + 1) % 3);
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Rating shortcuts (only when on answer side and study session is active)
    if (currentSide === 2 && studySession) {
      switch (e.key) {
        case '1':
          e.preventDefault();
          recordCardAnswer(false, 1);
          return;
        case '2':
          e.preventDefault();
          recordCardAnswer(false, 2);
          return;
        case '3':
          e.preventDefault();
          recordCardAnswer(true, 4);
          return;
        case '4':
          e.preventDefault();
          recordCardAnswer(true, 5);
          return;
      }
    }
    
    // Navigation shortcuts
    if (e.key === 'ArrowRight') nextCard();
    else if (e.key === 'ArrowLeft') prevCard();
    else if (e.key === ' ' || e.code === 'Space') { 
      e.preventDefault(); 
      nextSide(); 
    }
  }, [nextCard, prevCard, nextSide, currentSide, studySession, recordCardAnswer]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchMoved.current = false;
  };

  const onTouchMove = (e) => {
    touchMoved.current = true;
  };

  const onTouchEnd = (e) => {
    if (!touchStartX.current) return;
    
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    
    if (Math.abs(diff) > 50) {
      // Swipe gesture
      return diff > 0 ? nextCard() : prevCard();
    }
    
    // Simple tap (if didn't move much)
    if (!touchMoved.current) {
      nextSide();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="bg-slate-900 min-h-screen pt-20 flex items-center justify-center">
        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-12 text-center max-w-lg">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center justify-center gap-2">
            <BookIcon size={24} color="white" />
            Loading Flashcards...
          </h3>
          <p className="text-slate-300">Please wait while we load your study materials.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 min-h-screen pt-20 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-700 rounded-3xl p-12 text-center max-w-lg">
          <h3 className="text-2xl font-bold text-red-400 mb-4">❌ Error Loading Flashcards</h3>
          <p className="text-red-300 mb-6">{error}</p>
          <button
            onClick={loadFlashcards}
            className="px-6 py-3 text-white font-semibold rounded-xl transition-all duration-200"
            style={{background: 'linear-gradient(135deg, #A86240 0%, #97552B 100%)'}}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #97552B 0%, #86481A 100%)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #A86240 0%, #97552B 100)'}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="bg-slate-900 min-h-screen pt-20 flex items-center justify-center">
        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-12 text-center max-w-lg">
          <div className="mb-6">
            <BookIcon size={64} color="white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">No Flashcards Available</h3>
          <p className="text-slate-300">Create your first flashcard to start studying!</p>
        </div>
      </div>
    );
  }

  // Safety check for currentCard - after all hooks
  if (!currentCard) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="claude-card p-12 text-center max-w-lg">
          <div className="text-6xl mb-6">⚠️</div>
          <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>Card Not Found</h3>
          <p className="claude-text-secondary">Unable to load the requested flashcard.</p>
          <button
            onClick={loadFlashcards}
            className="claude-button-primary mt-6"
          >
            Reload Cards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}} role="main">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white shadow-lg" style={{background: 'linear-gradient(135deg, #A86240 0%, #97552B 100%)'}}>
              <TargetIcon size={32} color="white" />
            </div>
            <h2 className="text-4xl font-extrabold" style={{color: 'var(--claude-heading)'}}>
              Study Mode
            </h2>
          </div>
          <div className="claude-card px-4 py-2">
            <span className="claude-text-secondary font-medium">
              {currentIndex + 1} of {flashcards.length}
            </span>
          </div>
        </div>

        {/* Three-Sided Card */}
        <div className="relative">
          {/* Side Indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex claude-card p-2">
              {sideLabels.map((label, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSide(index)}
                  className={`px-6 py-2 rounded-xl font-medium transition-colors duration-200 ${
                    currentSide === index
                      ? 'bg-[var(--claude-accent)] text-white'
                      : 'text-[var(--claude-secondary-text)] hover:bg-[var(--claude-surface-hover)] hover:text-[var(--claude-primary-text)]'
                  }`}
                  aria-pressed={currentSide === index}
                  aria-label={`Show ${label} (${index + 1} of ${sideLabels.length})`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Card Content */}
          <div
            onClick={nextSide}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' || e.key === ' ') { 
                e.preventDefault(); 
                nextSide(); 
              } 
            }}
            className="claude-card p-12 min-h-[400px] flex flex-col justify-center items-center cursor-pointer transition-all duration-300 group hover:-translate-y-0.5 hover:border-[var(--claude-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--claude-accent)] focus:ring-opacity-50"
            style={{
              borderRadius: '24px'
            }}
            tabIndex={0}
            role="button"
            aria-label={`Show ${sideLabels[currentSide]} content. Press Space or Enter to continue.`}
          >
            <div className="text-center">
              <div className="text-sm font-medium mb-4 uppercase tracking-wider" style={{color: 'var(--claude-accent)'}}>
                {sideLabels[currentSide]}
              </div>
              <div 
                ref={cardRef}
                className="text-xl leading-relaxed transition-colors whitespace-pre-wrap" 
                style={{color: 'var(--claude-primary-text)'}}
              >
                {sideContent[currentSide]}
              </div>
            </div>
            
            {/* Tap to continue indicator */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 claude-text-muted text-sm">
              {currentSide < 2 ? 'Tap to see next side' : 'Tap to restart'}
            </div>
          </div>

          {/* Card metadata */}
          <div className="mt-4 flex justify-center items-center gap-4">
            {currentCard.subject && (
              <span className="claude-tag">
                {currentCard.subject}
              </span>
            )}
            {currentCard.slug ? (
              <a 
                href={`/card/${currentCard.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="claude-button-primary inline-flex items-center gap-2 text-sm"
              >
                <span>🔗</span>
                View Public Card
              </a>
            ) : (
              <div className="claude-button-secondary inline-flex items-center gap-2 text-sm opacity-50 cursor-not-allowed">
                <span>🔒</span>
                Private Card
              </div>
            )}
          </div>

          {/* Accuracy Tracking */}
          {currentSide === 2 && studySession && (
            <div className="mt-6 claude-card p-6" style={{background: 'linear-gradient(135deg, #A86240 0%, #97552B 100%)', color: 'white'}}>
              <div className="text-center mb-6">
                <h4 className="font-semibold text-white mb-2 text-lg">How well did you know this?</h4>
                <p className="text-sm text-white/90 mb-4">This helps track your learning progress</p>
                <div className="text-xs text-white/80 bg-white/10 rounded-lg px-3 py-2 inline-block">
                  💡 <strong>Keyboard shortcuts:</strong> Press <kbd className="bg-white/20 px-1 rounded">1</kbd>, <kbd className="bg-white/20 px-1 rounded">2</kbd>, <kbd className="bg-white/20 px-1 rounded">3</kbd>, or <kbd className="bg-white/20 px-1 rounded">4</kbd> to rate quickly
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => recordCardAnswer(false, 1)}
                  onKeyDown={(e) => e.key === '1' && recordCardAnswer(false, 1)}
                  className="flex flex-col items-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 text-white rounded-lg transition-all text-sm font-medium group"
                >
                  <ErrorIcon size={20} color="white" />
                  <span>Struggled</span>
                  <span className="text-xs opacity-70">(1)</span>
                </button>
                <button
                  onClick={() => recordCardAnswer(false, 2)}
                  onKeyDown={(e) => e.key === '2' && recordCardAnswer(false, 2)}
                  className="flex flex-col items-center gap-2 px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 hover:border-yellow-400/50 text-white rounded-lg transition-all text-sm font-medium group"
                >
                  <WarningIcon size={20} color="white" />
                  <span>Unsure</span>
                  <span className="text-xs opacity-70">(2)</span>
                </button>
                <button
                  onClick={() => recordCardAnswer(true, 4)}
                  onKeyDown={(e) => e.key === '3' && recordCardAnswer(true, 4)}
                  className="flex flex-col items-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 hover:border-green-400/50 text-white rounded-lg transition-all text-sm font-medium group"
                >
                  <SuccessIcon size={20} color="white" />
                  <span>Good</span>
                  <span className="text-xs opacity-70">(3)</span>
                </button>
                <button
                  onClick={() => recordCardAnswer(true, 5)}
                  onKeyDown={(e) => e.key === '4' && recordCardAnswer(true, 5)}
                  className="flex flex-col items-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/50 text-white rounded-lg transition-all text-sm font-medium group"
                >
                  <FastIcon size={20} color="white" />
                  <span>Perfect</span>
                  <span className="text-xs opacity-70">(4)</span>
                </button>
              </div>
              
              {cardAccuracy[currentCard.id] !== undefined && (
                <div className="mt-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    cardAccuracy[currentCard.id] 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {cardAccuracy[currentCard.id] ? '✅ Recorded as correct' : '❌ Recorded as incorrect'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={prevCard}
            disabled={currentIndex === 0}
            className="claude-button-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <div className="claude-text-muted text-sm">
            <div className="mb-2">Use arrow keys or swipe to navigate • Space to flip sides</div>
            <div className="text-xs bg-white/10 rounded-lg px-3 py-2 inline-block">
              💡 <strong>Rating shortcuts:</strong> Press <kbd className="bg-white/20 px-1 rounded">1-4</kbd> when reviewing to rate quickly
            </div>
          </div>
          
          <button
            onClick={nextCard}
            disabled={currentIndex === flashcards.length - 1}
            className="claude-button-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: currentIndex === flashcards.length - 1 
                ? 'var(--claude-muted)' 
                : 'var(--claude-accent)'
            }}
          >
            Next →
          </button>
        </div>

        {/* Screen reader announcements */}
        <span className="sr-only" aria-live="polite">
          {sideLabels[currentSide]}
        </span>
      </div>
    </div>
  );
};

export default StudyMode;