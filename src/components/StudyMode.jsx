import { useState, useEffect } from 'react';
import { FlashcardService } from '../services/flashcardService';
import { useAuth } from '../contexts/AuthContext';

const StudyMode = () => {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadFlashcards();
    }
  }, [user]);

  const loadFlashcards = async () => {
    try {
      setIsLoading(true);
      const cards = await FlashcardService.getPublicFlashcards(50);
      setFlashcards(cards);
    } catch (error) {
      setError('Failed to load flashcards');
      console.error('Error loading flashcards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const restartDeck = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  if (!user) {
    return (
      <div style={{
        background: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{color: '#333', marginBottom: '1rem'}}>🔐 Sign in to Study</h3>
        <p style={{color: '#666'}}>You need to be signed in to access the study mode.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        background: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{color: '#333', marginBottom: '1rem'}}>📚 Loading Flashcards...</h3>
        <p style={{color: '#666'}}>Please wait while we load the community flashcards.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#f8d7da',
        color: '#721c24',
        padding: '2rem',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{marginBottom: '1rem'}}>❌ Error Loading Flashcards</h3>
        <p>{error}</p>
        <button
          onClick={loadFlashcards}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '0.75rem 2rem',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div style={{
        background: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{color: '#333', marginBottom: '1rem'}}>📚 No Flashcards Available</h3>
        <p style={{color: '#666'}}>There are no public flashcards available yet. Be the first to create one!</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div style={{
      background: 'white',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{color: '#333', margin: 0}}>📚 Study Mode</h2>
        <div style={{
          background: '#f8f9fa',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          fontSize: '0.9rem',
          color: '#666'
        }}>
          {currentIndex + 1} of {flashcards.length}
        </div>
      </div>

      {/* Flashcard Display */}
      <div
        onClick={flipCard}
        style={{
          background: 'white',
          border: '2px solid #e9ecef',
          borderRadius: '12px',
          padding: '3rem 2rem',
          margin: '2rem 0',
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {!isFlipped ? (
          <div style={{textAlign: 'center'}}>
            <h3 style={{
              fontSize: '1.5rem',
              color: '#333',
              marginBottom: '1rem'
            }}>
              Question
            </h3>
            <p style={{
              fontSize: '1.2rem',
              color: '#666',
              lineHeight: '1.6'
            }}>
              {currentCard.question}
            </p>
            <p style={{
              fontSize: '0.9rem',
              color: '#999',
              marginTop: '2rem'
            }}>
              Click to reveal answer
            </p>
          </div>
        ) : (
          <div style={{textAlign: 'center'}}>
            <h3 style={{
              fontSize: '1.5rem',
              color: '#333',
              marginBottom: '1rem'
            }}>
              Answer
            </h3>
            <p style={{
              fontSize: '1.2rem',
              color: '#666',
              lineHeight: '1.6'
            }}>
              {currentCard.answer}
            </p>
            
            {/* Hints */}
            {currentCard.hints && currentCard.hints.length > 0 && (
              <div style={{marginTop: '2rem'}}>
                <h4 style={{
                  fontSize: '1.1rem',
                  color: '#333',
                  marginBottom: '1rem'
                }}>
                  💡 Hints
                </h4>
                {currentCard.hints.map((hint, index) => (
                  <p key={index} style={{
                    fontSize: '1rem',
                    color: '#666',
                    marginBottom: '0.5rem',
                    fontStyle: 'italic'
                  }}>
                    {hint}
                  </p>
                ))}
              </div>
            )}

            {/* Tags */}
            {currentCard.tags && currentCard.tags.length > 0 && (
              <div style={{marginTop: '1rem'}}>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'center'
                }}>
                  {currentCard.tags.map((tag, index) => (
                    <span key={index} style={{
                      background: '#e9ecef',
                      color: '#666',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p style={{
              fontSize: '0.9rem',
              color: '#999',
              marginTop: '2rem'
            }}>
              Click to see question again
            </p>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div style={{
        background: '#f8f9fa',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        fontSize: '0.9rem',
        color: '#666'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Subject: {currentCard.subject || 'Not specified'}</span>
          <span>Difficulty: {currentCard.difficulty || 'Not specified'}</span>
          <span>By: {currentCard.authorId || 'Unknown'}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={prevCard}
          disabled={currentIndex === 0}
          style={{
            background: currentIndex === 0 ? '#e9ecef' : '#007bff',
            color: currentIndex === 0 ? '#999' : 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '1rem'
          }}
        >
          ← Previous
        </button>

        <button
          onClick={flipCard}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          {isFlipped ? 'Show Question' : 'Show Answer'}
        </button>

        <button
          onClick={nextCard}
          disabled={currentIndex === flashcards.length - 1}
          style={{
            background: currentIndex === flashcards.length - 1 ? '#e9ecef' : '#007bff',
            color: currentIndex === flashcards.length - 1 ? '#999' : 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: currentIndex === flashcards.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '1rem'
          }}
        >
          Next →
        </button>

        <button
          onClick={restartDeck}
          style={{
            background: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          🔄 Restart
        </button>
      </div>
    </div>
  );
};

export default StudyMode;
