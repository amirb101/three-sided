import { useState, useEffect, useRef } from 'react'
import { FlashcardService } from '../services/flashcardService'
import { AnalyticsService } from '../services/analyticsService'
import { useAuth } from '../contexts/AuthContext'
import { useMathJax } from '../hooks/useMathJax'

// SM-2 Algorithm Constants
const MIN_EF = 1.3;

/**
 * SM-2 Spaced Repetition Algorithm
 * @param {Object} card - Current card with SRS data
 * @param {number} quality - Quality rating (1-5)
 * @param {number} nowMs - Current timestamp
 * @returns {Object} Updated card with new SRS values
 */
function sm2Update(card, quality, nowMs) {
  const was = {
    repetition: card.repetition ?? 0,
    interval: card.interval ?? 0, // in days
    easeFactor: card.easeFactor ?? 2.5,
  };

  let { repetition, interval, easeFactor } = was;

  if (quality < 3) {
    // Lapse: reset repetition
    repetition = 0;
    interval = 1; // review tomorrow
  } else {
    // Correct recall
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetition += 1;

    // EF update per SM-2 (bounded)
    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    easeFactor = Math.max(MIN_EF, parseFloat((easeFactor + delta).toFixed(2)));
  }

  const nextReview = new Date(nowMs + interval * 24 * 60 * 60 * 1000);

  const next = {
    ...card,
    repetition,
    interval,
    easeFactor,
    reviewCount: (card.reviewCount ?? 0) + 1,
    lastReviewed: new Date(nowMs),
    nextReview,
  };

  return { next };
}

const SpacedRepetition = ({ onClose, isVisible = false }) => {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    due: 0,
    new: 0,
    learning: 0,
    reviewing: 0
  })
  const [studySession, setStudySession] = useState(null)
  const [cardStartTime, setCardStartTime] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true;
    if (isVisible) {
      loadCards();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [isVisible])

  // Start study session when component mounts and cards are loaded
  useEffect(() => {
    if (user && cards.length > 0 && !studySession && isVisible) {
      startStudySession();
    }
  }, [user, cards.length, studySession, isVisible]);

  // Track card viewing time
  useEffect(() => {
    if (cards[currentCardIndex]) {
      setCardStartTime(Date.now());
    }
  }, [currentCardIndex]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (studySession) {
        endStudySession();
      }
    };
  }, [studySession]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose?.();
      if (!cards.length) return;
      if (!showAnswer && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault(); 
        setShowAnswer(true); 
        return;
      }
      if (showAnswer && '12345'.includes(e.key)) {
        e.preventDefault(); 
        handleAnswer(parseInt(e.key, 10));
      }
      if (e.key.toLowerCase() === 'r') resetSession();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isVisible, cards.length, showAnswer]);

  // Body scroll lock
  useEffect(() => {
    if (!isVisible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { 
      document.body.style.overflow = prev; 
    };
  }, [isVisible])

  // Session management functions
  const startStudySession = async () => {
    if (!user) return;
    
    try {
      const session = await AnalyticsService.startStudySession(user.uid, {
        mode: 'spaced_repetition',
        deckId: null,
        deckName: 'Spaced Repetition'
      });
      setStudySession(session);
      console.log('Spaced repetition session started:', session.sessionId);
    } catch (error) {
      console.error('Failed to start spaced repetition session:', error);
    }
  };

  const endStudySession = async () => {
    if (!studySession || !user) return;
    
    try {
      const sessionStats = await AnalyticsService.endStudySession(studySession.sessionId, user.uid);
      console.log('Spaced repetition session ended:', sessionStats);
      setStudySession(null);
    } catch (error) {
      console.warn('Analytics not available for session end:', error);
      setStudySession(null);
    }
  };

  const recordCardAnswer = async (quality, card) => {
    if (!studySession || !user || !cardStartTime) return;
    
    const timeSpent = Math.round((Date.now() - cardStartTime) / 1000);
    const wasCorrect = quality >= 3; // Quality 3+ is considered correct
    
    try {
      await AnalyticsService.recordCardAnswer(studySession.sessionId, {
        cardId: card.id,
        userId: user.uid,
        timeSpent,
        wasCorrect,
        attempts: 1,
        difficulty: 'medium',
        confidenceLevel: quality
      });
    } catch (error) {
      console.warn('Analytics not available for card answer:', error);
    }
  };

  const loadCards = async () => {
    try {
      setLoading(true);
      const all = await FlashcardService.getPublicFlashcards(50);
      
      if (!mountedRef.current) return;

      const now = Date.now();
      const seeded = all.map((c, i) => ({
        ...c,
        id: c.id || `card-${i}`,
        repetition: c.repetition ?? 0,
        interval: c.interval ?? 0,
        easeFactor: c.easeFactor ?? 2.5,
        reviewCount: c.reviewCount ?? 0,
        // schedule new cards as "due now"
        nextReview: c.nextReview ? new Date(c.nextReview) : new Date(now),
        difficulty: c.difficulty ?? 3,
        lastReviewed: c.lastReviewed ? new Date(c.lastReviewed) : null,
        question: c.statement ?? c.question ?? '',
        answer: c.proof ?? c.answer ?? '',
        hints: Array.isArray(c.hints) ? c.hints : (c.hints ? [c.hints] : []),
      }));

      // Today's queue: due first, then the rest
      const sorted = seeded.sort((a, b) => a.nextReview - b.nextReview);

      if (!mountedRef.current) return;
      setCards(sorted);
      updateStats(sorted);
    } catch (e) {
      console.error('Error loading cards:', e);
      if (mountedRef.current) {
        setCards([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  const updateStats = (list) => {
    const now = Date.now();
    const total = list.length;
    const due = list.filter(c => (c.nextReview?.getTime?.() ?? c.nextReview) <= now).length;
    const reviewCount = (c) => c.reviewCount ?? 0;
    const stats = {
      total,
      due,
      new: list.filter(c => reviewCount(c) === 0).length,
      learning: list.filter(c => reviewCount(c) > 0 && reviewCount(c) < 5).length,
      reviewing: list.filter(c => reviewCount(c) >= 5).length,
    };
    setStats(stats);
  }

  const handleAnswer = async (quality) => {
    const now = Date.now();
    const currentCard = cards[currentCardIndex];
    
    if (currentCard) {
      // Record the answer in analytics
      await recordCardAnswer(quality, currentCard);
    }
    
    setCards(prev => {
      if (!prev.length) return prev;

      const current = prev[currentCardIndex];
      if (!current) return prev;

      // SM-2 update with proper algorithm
      const { next } = sm2Update(current, quality, now);

      // Replace the one card immutably
      const updated = [...prev];
      updated[currentCardIndex] = next;

      // Sort a NEW array by nextReview
      const reSorted = [...updated].sort((a, b) => a.nextReview - b.nextReview);

      // Update stats separately
      updateStats(reSorted);

      return reSorted;
    });

    // Advance index safely after list changes
    setCurrentCardIndex((i) => {
      const nextIdx = Math.min(i + 1, cards.length - 1);
      return nextIdx;
    });
    setShowAnswer(false);
  }

  const resetSession = () => {
    setCurrentCardIndex(0)
    setShowAnswer(false)
  }

  const getCurrentCard = () => cards[currentCardIndex] || null
  const currentCard = getCurrentCard()

  // MathJax rendering when card changes
  useMathJax([currentCard, showAnswer])

  const getQualityLabels = () => [
    { value: 1, label: 'Again', color: 'bg-danger-500 hover:bg-danger-600' },
    { value: 2, label: 'Hard', color: 'bg-warning-500 hover:bg-warning-600' },
    { value: 3, label: 'Good', color: 'bg-success-500 hover:bg-success-600' },
    { value: 4, label: 'Easy', color: 'bg-primary-500 hover:bg-primary-600' },
    { value: 5, label: 'Perfect', color: 'bg-accent-500 hover:bg-accent-600' }
  ]

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="sr-title"
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 id="sr-title" className="text-2xl font-bold">🎯 Spaced Repetition</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
              aria-label="Close spaced repetition"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
          <p className="text-white/90 mt-1">Intelligent study scheduling for optimal learning</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-neutral-600 text-lg">Loading your study session...</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-neutral-800 mb-2">No cards available</h3>
              <p className="text-neutral-600">Create some flashcards to start studying!</p>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-primary-600">{stats.total}</div>
                  <div className="text-sm text-neutral-600">Total</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-danger-600">{stats.due}</div>
                  <div className="text-sm text-neutral-600">Due</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-accent-600">{stats.new}</div>
                  <div className="text-sm text-neutral-600">New</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-warning-600">{stats.learning}</div>
                  <div className="text-sm text-neutral-600">Learning</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-success-600">{stats.reviewing}</div>
                  <div className="text-sm text-neutral-600">Reviewing</div>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-neutral-700">
                    Card {currentCardIndex + 1} of {cards.length}
                  </span>
                  <span className="text-sm text-neutral-500">
                    {Math.round(((currentCardIndex + 1) / cards.length) * 100)}% complete
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Card */}
              <div className="card p-8 mb-8">
                <div className="text-center">
                  {/* Card Info */}
                  <div className="flex justify-center gap-4 mb-6 text-sm text-neutral-600">
                    <span>Interval: {getCurrentCard()?.interval || 0} days</span>
                    <span>Reviews: {getCurrentCard()?.reviewCount || 0}</span>
                    <span>Ease: {getCurrentCard()?.easeFactor?.toFixed(1) || '2.5'}</span>
                  </div>

                  {/* Question */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-neutral-800 mb-4">Question</h3>
                    <div className="bg-neutral-50 p-6 rounded-xl text-lg text-neutral-700 min-h-[100px] flex items-center justify-center">
                      {getCurrentCard()?.question || 'Loading...'}
                    </div>
                  </div>

                  {/* Answer */}
                  {showAnswer && (
                    <div className="mb-8 animate-fade-in">
                      <h3 className="text-xl font-semibold text-neutral-800 mb-4">Answer</h3>
                      <div className="bg-neutral-50 p-6 rounded-xl text-lg text-neutral-700 min-h-[100px] flex items-center justify-center">
                        {getCurrentCard()?.answer || 'No answer available'}
                      </div>
                      
                      {/* Hints */}
                      {getCurrentCard()?.hints && getCurrentCard().hints.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-lg font-medium text-neutral-700 mb-2">Hints</h4>
                          <div className="space-y-2">
                            {getCurrentCard().hints.map((hint, index) => (
                              <div key={index} className="bg-accent-50 p-3 rounded-lg text-neutral-700">
                                💡 {hint}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {!showAnswer ? (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="btn btn-primary text-lg px-8 py-4"
                      title="Show Answer (Space or Enter)"
                    >
                      Show Answer
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-neutral-800">How well did you know this?</h4>
                      <div className="flex flex-wrap justify-center gap-3">
                        {getQualityLabels().map(({ value, label, color }) => (
                          <button
                            key={value}
                            onClick={() => handleAnswer(value)}
                            className={`btn text-white px-6 py-3 ${color}`}
                            title={`${label} (${value})`}
                            aria-label={`Rate as ${label} (Press ${value})`}
                          >
                            {value}. {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Keyboard Shortcuts Help */}
              <div className="text-center mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">⌨️ Keyboard Shortcuts</h4>
                <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
                  <div><kbd className="px-1 py-0.5 bg-white border rounded text-xs">Space</kbd> Show Answer</div>
                  <div><kbd className="px-1 py-0.5 bg-white border rounded text-xs">1-5</kbd> Rate Quality</div>
                  <div><kbd className="px-1 py-0.5 bg-white border rounded text-xs">R</kbd> Reset Session</div>
                  <div><kbd className="px-1 py-0.5 bg-white border rounded text-xs">Esc</kbd> Close</div>
                </div>
              </div>

              {/* Session Controls */}
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={resetSession}
                  className="btn btn-secondary"
                  title="Reset Session (R)"
                >
                  🔄 Reset Session
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-primary"
                  title="Finish Session (Esc)"
                >
                  Finish Session
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SpacedRepetition
