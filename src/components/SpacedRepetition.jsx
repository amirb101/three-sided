import { useState, useEffect } from 'react'
import { FlashcardService } from '../services/flashcardService'

const SpacedRepetition = ({ onClose, isVisible = false }) => {
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

  useEffect(() => {
    if (isVisible) {
      loadCards()
    }
  }, [isVisible])

  const loadCards = async () => {
    try {
      setLoading(true)
      // In a real app, you'd fetch cards with spaced repetition data
      const allCards = await FlashcardService.getPublicFlashcards(50)
      
      // Simulate spaced repetition data
      const cardsWithSR = allCards.map((card, index) => ({
        ...card,
        id: card.id || `card-${index}`,
        interval: Math.floor(Math.random() * 7) + 1, // Days until next review
        easeFactor: 2.5 + (Math.random() * 0.5), // Ease factor (2.5-3.0)
        reviewCount: Math.floor(Math.random() * 10),
        nextReview: new Date(Date.now() + (Math.random() * 7 * 24 * 60 * 60 * 1000)),
        difficulty: Math.floor(Math.random() * 5) + 1, // 1-5 scale
        lastReviewed: new Date(Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000))
      }))

      // Sort by due date (earliest first)
      const sortedCards = cardsWithSR.sort((a, b) => a.nextReview - b.nextReview)
      
      setCards(sortedCards)
      updateStats(sortedCards)
    } catch (error) {
      console.error('Error loading cards:', error)
      setCards([])
    } finally {
      setLoading(false)
    }
  }

  const updateStats = (cardsList) => {
    const now = new Date()
    const stats = {
      total: cardsList.length,
      due: cardsList.filter(card => card.nextReview <= now).length,
      new: cardsList.filter(card => card.reviewCount === 0).length,
      learning: cardsList.filter(card => card.reviewCount > 0 && card.reviewCount < 5).length,
      reviewing: cardsList.filter(card => card.reviewCount >= 5).length
    }
    setStats(stats)
  }

  const handleAnswer = (quality) => {
    if (currentCardIndex >= cards.length) return

    const card = cards[currentCardIndex]
    const newCards = [...cards]
    
    // Update card based on answer quality
    if (quality >= 3) {
      // Good answer - increase interval
      card.interval = Math.floor(card.interval * card.easeFactor)
      card.easeFactor = Math.max(1.3, card.easeFactor + 0.1)
    } else if (quality === 2) {
      // Hard answer - slight increase
      card.interval = Math.max(1, Math.floor(card.interval * 1.1))
    } else {
      // Again - reset to learning
      card.interval = 1
      card.easeFactor = Math.max(1.3, card.easeFactor - 0.2)
    }

    card.reviewCount++
    card.lastReviewed = new Date()
    card.nextReview = new Date(Date.now() + (card.interval * 24 * 60 * 60 * 1000))

    // Re-sort cards
    newCards.sort((a, b) => a.nextReview - b.nextReview)
    setCards(newCards)
    updateStats(newCards)

    // Move to next card
    if (currentCardIndex < newCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setShowAnswer(false)
    } else {
      // Finished all cards
      setCurrentCardIndex(0)
      setShowAnswer(false)
    }
  }

  const resetSession = () => {
    setCurrentCardIndex(0)
    setShowAnswer(false)
  }

  const getCurrentCard = () => cards[currentCardIndex] || null

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
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">🎯 Spaced Repetition</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
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
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Controls */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={resetSession}
                  className="btn btn-secondary"
                >
                  🔄 Reset Session
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-primary"
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
