import { useState, useEffect } from 'react';
import { FlashcardService } from '../services/flashcardService';
import { SecurityService } from '../services/securityService';
import { useAuth } from '../contexts/AuthContext';
import AIService from '../services/aiService';
import TagSelector from './TagSelector';
import SubjectSelector from './SubjectSelector';
import DeckSelector from './DeckSelector';

const FlashcardCreator = ({ onCardCreated, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    statement: '',
    hints: '',
    proof: '',
    tags: '',
    subject: '',
    isPublic: true,
    deckId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [aiLoading, setAiLoading] = useState({
    autoFill: false,
    autoTag: false,
    convertLatex: false
  });

  // Initialize MathJax if available
  useEffect(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise();
    }
  }, [formData]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!user?.uid) return;
    
    // Load saved draft on component mount
    const savedDraft = localStorage.getItem(`flashcard_draft_${user.uid}`);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        // Only restore if it's recent (within 24 hours)
        const draftAge = Date.now() - (draft.timestamp || 0);
        if (draftAge < 24 * 60 * 60 * 1000) {
          setFormData(prev => ({
            ...prev,
            ...draft.data
          }));
        } else {
          // Remove old draft
          localStorage.removeItem(`flashcard_draft_${user.uid}`);
        }
      } catch (error) {
        console.warn('Failed to restore draft:', error);
        localStorage.removeItem(`flashcard_draft_${user.uid}`);
      }
    }
  }, [user?.uid]);

  // Auto-save current form data
  useEffect(() => {
    if (!user?.uid) return;
    
    // Only save if there's actual content
    const hasContent = formData.statement.trim() || formData.hints.trim() || formData.proof.trim();
    if (!hasContent) return;
    
    // Debounce the save operation
    const timeoutId = setTimeout(() => {
      const draft = {
        data: formData,
        timestamp: Date.now()
      };
      localStorage.setItem(`flashcard_draft_${user.uid}`, JSON.stringify(draft));
    }, 2000); // Save after 2 seconds of inactivity
    
    return () => clearTimeout(timeoutId);
  }, [formData, user?.uid]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  // AI Handler Functions
  const handleAutoFill = async () => {
    if (!formData.statement.trim()) {
      setError('Please enter a statement first');
      return;
    }

    setAiLoading(prev => ({ ...prev, autoFill: true }));
    setError('');

    try {
      const result = await AIService.autoFillFromStatement(formData.statement);
      
      setFormData(prev => ({
        ...prev,
        hints: result.hints || prev.hints,
        proof: result.proof || prev.proof,
        tags: result.tags ? result.tags.join(', ') : prev.tags
      }));

      // Re-render MathJax after content update
      setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise();
        }
      }, 100);

    } catch (error) {
      console.error('AI autofill error:', error);
      setError(`AI autofill failed: ${error.message}`);
    } finally {
      setAiLoading(prev => ({ ...prev, autoFill: false }));
    }
  };

  const handleAutoTag = async () => {
    if (!formData.statement.trim()) {
      setError('Please enter a statement first');
      return;
    }

    setAiLoading(prev => ({ ...prev, autoTag: true }));
    setError('');

    try {
      const tags = await AIService.autoTagOnly(formData.statement);
      
      setFormData(prev => ({
        ...prev,
        tags: tags.join(', ')
      }));

    } catch (error) {
      console.error('AI auto-tag error:', error);
      setError(`AI auto-tag failed: ${error.message}`);
    } finally {
      setAiLoading(prev => ({ ...prev, autoTag: false }));
    }
  };

  const handleConvertLatex = async (field) => {
    const content = formData[field];
    if (!content.trim()) {
      setError(`Please enter some ${field} content first`);
      return;
    }

    setAiLoading(prev => ({ ...prev, convertLatex: true }));
    setError('');

    try {
      const latexContent = await AIService.convertToLaTeX(content);
      
      setFormData(prev => ({
        ...prev,
        [field]: latexContent
      }));

      // Re-render MathJax after content update
      setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise();
        }
      }, 100);

    } catch (error) {
      console.error('LaTeX conversion error:', error);
      setError(`LaTeX conversion failed: ${error.message}`);
    } finally {
      setAiLoading(prev => ({ ...prev, convertLatex: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please sign in to create flashcards');
      return;
    }

    // Rate limiting check
    const rateLimitCheck = SecurityService.checkRateLimit(`flashcard_create_${user.uid}`, 5, 300000); // 5 per 5 minutes
    if (!rateLimitCheck.allowed) {
      setError(rateLimitCheck.message);
      return;
    }

    // Comprehensive security validation
    const validation = SecurityService.validateFlashcardInput(formData);
    if (!validation.isValid) {
      setError(validation.errors[0]); // Show first error
      return;
    }

    // Check for suspicious content
    const suspiciousCheck = SecurityService.detectSuspiciousContent(
      `${formData.statement} ${formData.hints} ${formData.proof}`
    );
    if (suspiciousCheck.isSuspicious) {
      setError('Content contains potentially unsafe elements. Please review and try again.');
      console.warn('Suspicious content detected:', suspiciousCheck.findings);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Use sanitized data from validation
      const cardData = {
        ...validation.sanitizedData,
        createdAt: new Date()
      };

      await FlashcardService.createFlashcard(cardData, user.uid, formData.deckId || null);
      
      // Clear the saved draft since card was created successfully
      localStorage.removeItem(`flashcard_draft_${user.uid}`);
      
      setSuccess(true);
      setTimeout(() => {
        if (onCardCreated) onCardCreated();
        if (onClose) onClose();
      }, 1500);

    } catch (error) {
      console.error('Error creating flashcard:', error);
      const publicError = SecurityService.getPublicErrorMessage(error, process.env.NODE_ENV === 'production');
      setError(publicError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="claude-card p-12 text-center max-w-lg">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold claude-success mb-4">Flashcard Created!</h3>
          <p className="claude-text-secondary">Your flashcard has been saved successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-4" style={{color: 'var(--claude-heading)'}}>
            ✏️ Create Flashcard
          </h1>
          <p className="claude-text-secondary text-lg">Build a three-sided flashcard with statement, hints, and proof</p>
          
          {/* Draft Auto-Save Indicator */}
          {user && (formData.statement.trim() || formData.hints.trim() || formData.proof.trim()) && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Auto-saving draft...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Statement Section */}
          <div className="claude-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 claude-gradient rounded-xl flex items-center justify-center text-white font-bold">
                1
              </div>
              <h2 className="text-2xl font-bold" style={{color: 'var(--claude-heading)'}}>Statement</h2>
              <span className="claude-error text-sm">*Required</span>
            </div>
            
            <textarea
              value={formData.statement}
              onChange={(e) => handleInputChange('statement', e.target.value)}
              placeholder="Enter the problem statement, theorem, or question here...&#10;&#10;Example: Prove that the derivative of sin(x) is cos(x)"
              className="claude-input w-full h-32 resize-none"
              required
            />
            
            {/* AI Buttons */}
            {formData.statement.trim() && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={aiLoading.autoFill}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  style={{
                    background: aiLoading.autoFill 
                      ? 'var(--claude-muted)' 
                      : 'linear-gradient(135deg, #635BFF 0%, #7C3AED 100%)'
                  }}
                >
                  {aiLoading.autoFill ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>🤖</span>
                  )}
                  <span>{aiLoading.autoFill ? 'Generating...' : 'Autofill Hints, Proof & Tags'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoTag}
                  disabled={aiLoading.autoTag}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  style={{
                    background: aiLoading.autoTag 
                      ? 'var(--claude-muted)' 
                      : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  }}
                >
                  {aiLoading.autoTag ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>🏷️</span>
                  )}
                  <span>{aiLoading.autoTag ? 'Generating...' : 'Auto Tag Only'}</span>
                </button>
              </div>
            )}

            {/* Live Preview */}
            {formData.statement && (
              <div className="mt-4 p-4" style={{backgroundColor: 'var(--claude-subtle)', border: '1px solid var(--claude-border)', borderRadius: '12px'}}>
                <div className="text-sm claude-text-muted mb-2">Preview:</div>
                <div style={{color: 'var(--claude-primary-text)'}} dangerouslySetInnerHTML={{ __html: formData.statement }}></div>
              </div>
            )}
          </div>

          {/* Hints Section */}
          <div className="claude-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{background: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)'}}>
                2
              </div>
              <h2 className="text-2xl font-bold" style={{color: 'var(--claude-heading)'}}>Hints</h2>
              <span className="claude-text-muted text-sm">Optional</span>
            </div>
            
            <textarea
              value={formData.hints}
              onChange={(e) => handleInputChange('hints', e.target.value)}
              placeholder="Provide helpful hints or guidance...&#10;&#10;Example: Start by using the definition of derivative as a limit. Consider the addition formula for sine."
              className="claude-input w-full h-24 resize-none"
            />
            
            {/* LaTeX Conversion Button for Hints */}
            {formData.hints.trim() && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleConvertLatex('hints')}
                  disabled={aiLoading.convertLatex}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-medium text-sm shadow hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  style={{
                    background: aiLoading.convertLatex 
                      ? 'var(--claude-muted)' 
                      : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                  }}
                >
                  {aiLoading.convertLatex ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>📐</span>
                  )}
                  <span>{aiLoading.convertLatex ? 'Converting...' : 'Convert to LaTeX'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Proof Section */}
          <div className="claude-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{background: 'linear-gradient(135deg, var(--claude-success) 0%, #10b981 100%)'}}>
                3
              </div>
              <h2 className="text-2xl font-bold" style={{color: 'var(--claude-heading)'}}>Proof / Answer</h2>
              <span className="claude-error text-sm">*Required</span>
            </div>
            
            <textarea
              value={formData.proof}
              onChange={(e) => handleInputChange('proof', e.target.value)}
              placeholder="Provide the complete proof, solution, or detailed answer...&#10;&#10;Example: Using the definition of derivative:&#10;f'(x) = lim(h→0) [sin(x+h) - sin(x)]/h&#10;= lim(h→0) [sin(x)cos(h) + cos(x)sin(h) - sin(x)]/h&#10;..."
              className="claude-input w-full h-40 resize-none"
              required
            />
            
            {/* LaTeX Conversion Button for Proof */}
            {formData.proof.trim() && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleConvertLatex('proof')}
                  disabled={aiLoading.convertLatex}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-medium text-sm shadow hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  style={{
                    background: aiLoading.convertLatex 
                      ? 'var(--claude-muted)' 
                      : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                  }}
                >
                  {aiLoading.convertLatex ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>📐</span>
                  )}
                  <span>{aiLoading.convertLatex ? 'Converting...' : 'Convert to LaTeX'}</span>
                </button>
              </div>
            )}
            
            {/* Live Preview */}
            {formData.proof && (
              <div className="mt-4 p-4" style={{backgroundColor: 'var(--claude-subtle)', border: '1px solid var(--claude-border)', borderRadius: '12px'}}>
                <div className="text-sm claude-text-muted mb-2">Preview:</div>
                <div className="whitespace-pre-wrap" style={{color: 'var(--claude-primary-text)'}} dangerouslySetInnerHTML={{ __html: formData.proof }}></div>
              </div>
            )}
          </div>

          {/* Metadata Section */}
          <div className="claude-card p-8">
            <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--claude-heading)'}}>Card Details</h2>
            
            <div className="space-y-6">
              {/* Subject Selector */}
              <div>
                <label className="block claude-text-secondary font-medium mb-2">Subject</label>
                <SubjectSelector
                  value={formData.subject}
                  onChange={(value) => handleInputChange('subject', value)}
                  placeholder="Select or type a subject (e.g. Calculus, Physics)"
                />
              </div>
              
              {/* Tags Selector */}
              <div>
                <label className="block claude-text-secondary font-medium mb-2">Tags</label>
                <TagSelector
                  value={formData.tags}
                  onChange={(value) => handleInputChange('tags', value)}
                  placeholder="Type tags here or click existing tags below"
                />
              </div>

              {/* Deck Selector */}
              <div>
                <label className="block claude-text-secondary font-medium mb-2">
                  Deck <span className="text-sm claude-text-muted">(optional)</span>
                </label>
                <DeckSelector
                  value={formData.deckId}
                  onChange={(value) => handleInputChange('deckId', value)}
                  placeholder="Choose a deck to organize this card"
                  rememberSelection={true}
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="w-5 h-5 rounded"
                  style={{
                    accentColor: 'var(--claude-accent)',
                    backgroundColor: formData.isPublic ? 'var(--claude-accent)' : 'var(--claude-surface)',
                    borderColor: 'var(--claude-border)'
                  }}
                />
                <span className="claude-text-secondary font-medium">
                  Make this flashcard public (others can discover and study it)
                </span>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-2xl" style={{backgroundColor: 'rgba(255, 99, 99, 0.1)', border: '1px solid var(--claude-error)'}}>
              <div className="flex items-center gap-2 claude-error">
                <span>❌</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="claude-button-secondary"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || !formData.statement.trim() || !formData.proof.trim()}
              className="claude-button-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting || !formData.statement.trim() || !formData.proof.trim() 
                  ? 'var(--claude-muted)' 
                  : 'var(--claude-accent)'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Create Flashcard
                </>
              )}
            </button>
          </div>
        </form>

        {/* LaTeX Help */}
        <div className="mt-8 p-6 rounded-2xl" style={{backgroundColor: 'rgba(68, 90, 255, 0.1)', border: '1px solid var(--claude-accent-blue)'}}>
          <h3 className="text-lg font-semibold mb-3" style={{color: 'var(--claude-accent-blue)'}}>💡 LaTeX Math Support</h3>
          <div className="claude-text-secondary text-sm space-y-2">
            <p>Use LaTeX for mathematical expressions:</p>
            <div className="claude-card p-3 font-mono text-xs">
              <div>Inline: <code>$f(x) = x^2 + 2x + 1$</code></div>
              <div>Block: <code>$$\int_0^1 x^2 dx = \frac{1}{3}$$</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardCreator;