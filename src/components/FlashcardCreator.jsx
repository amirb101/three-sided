import { useState } from 'react';
import { FlashcardService } from '../services/flashcardService';
import { useAuth } from '../contexts/AuthContext';
import AIFlashcardEnhancer from './AIFlashcardEnhancer';

const FlashcardCreator = ({ onCardCreated, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    hints: [''],
    tags: '',
    difficulty: 'medium',
    subject: '',
    isPublic: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAIEnhancer, setShowAIEnhancer] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHintChange = (index, value) => {
    const newHints = [...formData.hints];
    newHints[index] = value;
    setFormData(prev => ({
      ...prev,
      hints: newHints
    }));
  };

  const addHint = () => {
    setFormData(prev => ({
      ...prev,
      hints: [...prev.hints, '']
    }));
  };

  const removeHint = (index) => {
    if (formData.hints.length > 1) {
      const newHints = formData.hints.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        hints: newHints
      }));
    }
  };

  const handleAIEnhancement = (type, result) => {
    switch (type) {
      case 'hint':
        if (result && !formData.hints.includes(result)) {
          setFormData(prev => ({
            ...prev,
            hints: [...prev.hints.filter(h => h.trim()), result]
          }));
        }
        break;
      case 'suggestions':
        // Could implement suggestions handling
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to create flashcards');
      return;
    }

    if (!formData.question.trim() || !formData.answer.trim()) {
      setError('Question and answer are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const cardData = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        hints: formData.hints.filter(hint => hint.trim()),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        difficulty: formData.difficulty,
        subject: formData.subject.trim(),
        isPublic: formData.isPublic
      };

      const cardId = await FlashcardService.createFlashcard(cardData, user.uid);
      
      // Reset form
      setFormData({
        question: '',
        answer: '',
        hints: [''],
        tags: '',
        difficulty: 'medium',
        subject: '',
        isPublic: true
      });

      if (onCardCreated) {
        onCardCreated(cardId);
      }
    } catch (error) {
      setError('Failed to create flashcard. Please try again.');
      console.error('Error creating flashcard:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div style={{
        background: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{color: '#333', marginBottom: '1rem'}}>🔐 Sign in to Create Flashcards</h3>
        <p style={{color: '#666'}}>You need to be signed in to create and share flashcards with the community.</p>
      </div>
    );
  }

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
        <h2 style={{color: '#333', margin: 0}}>✏️ Create New Flashcard</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <div style={{marginBottom: '1.5rem'}}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#333'
          }}>
            Question *
          </label>
          <textarea
            value={formData.question}
            onChange={(e) => handleInputChange('question', e.target.value)}
            placeholder="Enter your question here..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              fontFamily: 'inherit'
            }}
            required
          />
        </div>

        <div style={{marginBottom: '1.5rem'}}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#333'
          }}>
            Answer *
          </label>
          <textarea
            value={formData.answer}
            onChange={(e) => handleInputChange('answer', e.target.value)}
            placeholder="Enter the answer here..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              fontFamily: 'inherit'
            }}
            required
          />
        </div>

        {/* AI Enhancement Button */}
        {formData.question.trim() && formData.answer.trim() && (
          <div style={{marginBottom: '1.5rem'}}>
            <button
              type="button"
              onClick={() => setShowAIEnhancer(!showAIEnhancer)}
              style={{
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {showAIEnhancer ? '🤖 Hide AI Enhancer' : '🤖 Show AI Enhancer'}
            </button>
          </div>
        )}

        {/* AI Enhancer */}
        {showAIEnhancer && formData.question.trim() && formData.answer.trim() && (
          <div style={{marginBottom: '2rem'}}>
            <AIFlashcardEnhancer
              question={formData.question}
              answer={formData.answer}
              subject={formData.subject}
              onEnhancementComplete={handleAIEnhancement}
            />
          </div>
        )}

        <div style={{marginBottom: '1.5rem'}}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#333'
          }}>
            Hints
          </label>
          {formData.hints.map((hint, index) => (
            <div key={index} style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <input
                type="text"
                value={hint}
                onChange={(e) => handleHintChange(index, e.target.value)}
                placeholder={`Hint ${index + 1}...`}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
              {formData.hints.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeHint(index)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    minWidth: '40px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addHint}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            + Add Hint
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="e.g., Mathematics, Physics..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              Difficulty
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div style={{marginBottom: '1.5rem'}}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#333'
          }}>
            Tags
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            placeholder="Enter tags separated by commas (e.g., calculus, limits, analysis)"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{marginBottom: '2rem'}}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => handleInputChange('isPublic', e.target.checked)}
              style={{transform: 'scale(1.2)'}}
            />
            <span style={{color: '#333'}}>Make this flashcard public</span>
          </label>
        </div>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '6px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Flashcard'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FlashcardCreator;
