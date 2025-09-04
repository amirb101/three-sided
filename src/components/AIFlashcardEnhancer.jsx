import { useState } from 'react';
import { aiService } from '../services/aiService';

const AIFlashcardEnhancer = ({ question, answer, subject, onEnhancementComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [enhancements, setEnhancements] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('hint');

  const generateEnhancement = async (type) => {
    setIsLoading(true);
    setError('');
    setActiveTab(type);

    try {
      let result;
      switch (type) {
        case 'hint':
          result = await aiService.generateHint(question, answer, subject);
          break;
        case 'proof':
          result = await aiService.generateProof(question, answer, subject);
          break;
        case 'suggestions':
          result = await aiService.suggestImprovements(question, answer, subject);
          break;
        case 'related':
          result = await aiService.generateRelatedQuestions(question, answer, subject);
          break;
        default:
          throw new Error('Invalid enhancement type');
      }

      setEnhancements(prev => ({
        ...prev,
        [type]: result
      }));

      if (onEnhancementComplete) {
        onEnhancementComplete(type, result);
      }
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      
      // Use fallback methods
      let fallbackResult;
      switch (type) {
        case 'hint':
          fallbackResult = aiService.generateFallbackHint(question, answer, subject);
          break;
        case 'proof':
          fallbackResult = aiService.generateFallbackProof(question, answer, subject);
          break;
        case 'suggestions':
          fallbackResult = aiService.generateFallbackSuggestions(question, answer, subject);
          break;
        case 'related':
          fallbackResult = aiService.generateFallbackRelatedQuestions(question, answer, subject);
          break;
      }

      setEnhancements(prev => ({
        ...prev,
        [type]: fallbackResult
      }));

      setError(`AI service unavailable. Using fallback ${type}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAllEnhancements = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [hint, proof, suggestions, related] = await Promise.all([
        aiService.generateHint(question, answer, subject).catch(() => aiService.generateFallbackHint(question, answer, subject)),
        aiService.generateProof(question, answer, subject).catch(() => aiService.generateFallbackProof(question, answer, subject)),
        aiService.suggestImprovements(question, answer, subject).catch(() => aiService.generateFallbackSuggestions(question, answer, subject)),
        aiService.generateRelatedQuestions(question, answer, subject).catch(() => aiService.generateFallbackRelatedQuestions(question, answer, subject))
      ]);

      const allEnhancements = { hint, proof, suggestions, related };
      setEnhancements(allEnhancements);

      if (onEnhancementComplete) {
        Object.entries(allEnhancements).forEach(([type, result]) => {
          onEnhancementComplete(type, result);
        });
      }
    } catch (error) {
      console.error('Error generating all enhancements:', error);
      setError('Failed to generate enhancements. Please try individual options.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard');
    });
  };

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
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{color: '#333', marginBottom: '1rem'}}>🤖 AI Flashcard Enhancer</h2>
        <p style={{color: '#666', marginBottom: '1.5rem'}}>
          Use AI to enhance your flashcard with hints, proofs, and suggestions
        </p>
        
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => generateEnhancement('hint')}
            disabled={isLoading}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            💡 Generate Hint
          </button>
          
          <button
            onClick={() => generateEnhancement('proof')}
            disabled={isLoading}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            📝 Generate Proof
          </button>
          
          <button
            onClick={() => generateEnhancement('suggestions')}
            disabled={isLoading}
            style={{
              background: '#ffc107',
              color: '#333',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            💡 Get Suggestions
          </button>
          
          <button
            onClick={() => generateEnhancement('related')}
            disabled={isLoading}
            style={{
              background: '#6f42c1',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            🔗 Related Questions
          </button>
          
          <button
            onClick={generateAllEnhancements}
            disabled={isLoading}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            🚀 Generate All
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#666'
        }}>
          <div style={{fontSize: '2rem', marginBottom: '1rem'}}>🤖</div>
          <p>AI is thinking...</p>
        </div>
      )}

      {enhancements && !isLoading && (
        <div style={{marginTop: '2rem'}}>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e9ecef',
            marginBottom: '1.5rem'
          }}>
            {Object.keys(enhancements).map((type) => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '1rem 1.5rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === type ? '2px solid #007bff' : 'none',
                  color: activeTab === type ? '#007bff' : '#666',
                  fontWeight: activeTab === type ? '600' : '400'
                }}
              >
                {type === 'hint' && '💡 Hint'}
                {type === 'proof' && '📝 Proof'}
                {type === 'suggestions' && '💡 Suggestions'}
                {type === 'related' && '🔗 Related Questions'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{minHeight: '200px'}}>
            {activeTab === 'hint' && enhancements.hint && (
              <div>
                <h3 style={{color: '#333', marginBottom: '1rem'}}>AI-Generated Hint</h3>
                <div style={{
                  background: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  position: 'relative'
                }}>
                  <p style={{color: '#333', lineHeight: '1.6', margin: 0}}>
                    {enhancements.hint}
                  </p>
                  <button
                    onClick={() => copyToClipboard(enhancements.hint)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'proof' && enhancements.proof && (
              <div>
                <h3 style={{color: '#333', marginBottom: '1rem'}}>AI-Generated Proof</h3>
                <div style={{
                  background: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  position: 'relative'
                }}>
                  <p style={{color: '#333', lineHeight: '1.6', margin: 0}}>
                    {enhancements.proof}
                  </p>
                  <button
                    onClick={() => copyToClipboard(enhancements.proof)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'suggestions' && enhancements.suggestions && (
              <div>
                <h3 style={{color: '#333', marginBottom: '1rem'}}>AI-Generated Suggestions</h3>
                <div style={{
                  background: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  position: 'relative'
                }}>
                  {Array.isArray(enhancements.suggestions) ? (
                    <ul style={{color: '#333', lineHeight: '1.6', margin: 0, paddingLeft: '1.5rem'}}>
                      {enhancements.suggestions.map((suggestion, index) => (
                        <li key={index} style={{marginBottom: '0.5rem'}}>{suggestion}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{color: '#333', lineHeight: '1.6', margin: 0}}>
                      {enhancements.suggestions}
                    </p>
                  )}
                  <button
                    onClick={() => copyToClipboard(Array.isArray(enhancements.suggestions) ? enhancements.suggestions.join('\n') : enhancements.suggestions)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'related' && enhancements.related && (
              <div>
                <h3 style={{color: '#333', marginBottom: '1rem'}}>AI-Generated Related Questions</h3>
                <div style={{
                  background: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  position: 'relative'
                }}>
                  {Array.isArray(enhancements.related) ? (
                    <ol style={{color: '#333', lineHeight: '1.6', margin: 0, paddingLeft: '1.5rem'}}>
                      {enhancements.related.map((question, index) => (
                        <li key={index} style={{marginBottom: '0.5rem'}}>{question}</li>
                      ))}
                    </ol>
                  ) : (
                    <p style={{color: '#333', lineHeight: '1.6', margin: 0}}>
                      {enhancements.related}
                    </p>
                  )}
                  <button
                    onClick={() => copyToClipboard(Array.isArray(enhancements.related) ? enhancements.related.join('\n') : enhancements.related)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: '#666',
        textAlign: 'center'
      }}>
        <p style={{margin: 0}}>
          💡 <strong>Tip:</strong> Use these AI enhancements to make your flashcards more effective for learning!
        </p>
      </div>
    </div>
  );
};

export default AIFlashcardEnhancer;
