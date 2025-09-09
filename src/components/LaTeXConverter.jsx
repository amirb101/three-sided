import { useEffect, useRef, useState, useCallback } from 'react';
import AIService from '../services/aiService';
import { useMathJax } from '../hooks/useMathJax';

const useDebounced = (value, delay = 200) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

const LaTeXConverter = ({ onClose, isVisible = false }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const previewRef = useRef(null);

  const [examples] = useState([
    'A direct sum B',
    'The integral from 0 to infinity of x squared dx',
    'The limit as x approaches 0 of sin x over x',
    'The matrix with rows [1,2] and [3,4]',
    'The set of all real numbers x such that x is greater than 0',
    'The derivative of f with respect to x',
    'The sum from n equals 1 to infinity of 1 over n squared',
    'The product from i equals 1 to n of i',
    'The square root of a squared plus b squared',
    'The absolute value of x minus 3',
  ]);

  const debouncedOutput = useDebounced(output, 150);

  // Focus the input when modal opens
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isVisible]);

  // ESC to close
  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isVisible, onClose]);

  // Use the enhanced MathJax hook with scoped rendering
  useMathJax([debouncedOutput], previewRef.current);

  const handleConvert = useCallback(async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const result = await AIService.convertToLaTeX(input);
      setOutput(result || '');
    } catch (err) {
      console.error('Error converting to LaTeX:', err);
      setError('Could not convert to LaTeX. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleExampleClick = async (example) => {
    setInput(example);
    // Convert immediately for 1-click experience
    // Wait one tick so state updates before convert reads it
    setTimeout(() => { handleConvert(); }, 0);
  };

  const handleCopyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopied(false);
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setCopied(false);
    setError('');
    setLoading(false);
  };

  const onTextKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleConvert();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}
      role="dialog"
      aria-modal="true"
      aria-labelledby="latex-converter-title"
    >
      <div className="claude-card rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 text-white claude-gradient">
          <div className="flex items-center justify-between">
            <h2 id="latex-converter-title" className="text-2xl font-bold">🔄 LaTeX Converter</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="text-white/90 mt-1">Convert natural language to beautiful mathematical notation</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div>
              <h3 className="text-xl font-semibold mb-4" style={{color: 'var(--heading)'}}>Input</h3>

              <div className="mb-6">
                <label htmlFor="nl-input" className="block text-sm font-medium claude-text-secondary mb-2">
                  Natural Language Description
                </label>
                <textarea
                  id="nl-input"
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., A direct sum B, The integral from 0 to infinity of x squared dx..."
                  className="claude-input h-32"
                  onKeyDown={onTextKeyDown}
                />
                <p className="text-xs claude-text-muted mt-1">
                  Press Ctrl/⌘ + Enter to convert
                </p>
              </div>

              <button
                onClick={handleConvert}
                disabled={!input.trim() || loading}
                className="claude-button-primary w-full mb-4 disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Converting...
                  </span>
                ) : (
                  '🔄 Convert to LaTeX'
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="claude-alert claude-alert-error mb-4">
                  {error}{' '}
                  <button
                    className="underline ml-1 font-medium"
                    onClick={handleConvert}
                    disabled={loading}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Examples */}
              <div>
                <h4 className="text-lg font-medium claude-text-secondary mb-3">Quick Examples</h4>
                <div className="space-y-2">
                  {examples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="claude-card block w-full text-left p-3 text-sm claude-text-secondary transition-all hover:shadow-md"
                      aria-label={`Use example: ${example}`}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Output Section */}
            <div>
              <h3 className="text-xl font-semibold mb-4" style={{color: 'var(--heading)'}}>Output</h3>

              <div className="mb-6">
                <label htmlFor="latex-output" className="block text-sm font-medium claude-text-secondary mb-2">
                  LaTeX Code
                </label>
                <div className="relative">
                  <textarea
                    id="latex-output"
                    value={output}
                    readOnly
                    placeholder="LaTeX will appear here..."
                    className="claude-input h-32 font-mono"
                    style={{backgroundColor: 'var(--background-modal)'}}
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    {output && (
                      <button
                        onClick={handleCopyToClipboard}
                        className="claude-button-secondary p-2"
                        title="Copy to clipboard"
                        aria-label="Copy LaTeX to clipboard"
                      >
                        📋
                      </button>
                    )}
                    {copied && (
                      <span
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: 'rgba(91, 200, 162, 0.1)',
                          color: 'var(--success)'
                        }}
                        role="status"
                        aria-live="polite"
                      >
                        Copied!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rendered Preview */}
              {output && (
                <div className="mb-6">
                  <label className="block text-sm font-medium claude-text-secondary mb-2">
                    Preview
                  </label>
                  <div className="claude-card p-4 min-h-[100px]" style={{
                    border: '2px dashed var(--border-light)'
                  }}>
                    <div ref={previewRef} className="prose max-w-none">
                      {/* Show raw TeX so MathJax can parse it */}
                      {debouncedOutput}
                    </div>
                    {!window.MathJax && (
                      <div className="text-center mt-2 claude-text-muted text-xs">
                        (MathJax not loaded – preview shows raw TeX)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleClear}
                  disabled={!input && !output && !error}
                  className="claude-button-secondary w-full disabled:opacity-60"
                >
                  🗑️ Clear All
                </button>

                <div className="text-center">
                  <p className="text-sm claude-text-secondary">
                    💡 Tip: Use this tool to quickly convert mathematical expressions
                  </p>
                  <p className="text-xs claude-text-muted mt-1">
                    Perfect for creating flashcards with LaTeX support
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 p-4 rounded-xl" style={{
            background: 'linear-gradient(to right, var(--background-modal), rgba(68, 90, 255, 0.05))'
          }}>
            <h4 className="font-semibold mb-2" style={{color: 'var(--heading)'}}>How to use LaTeX in Three-Sided:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm claude-text-secondary">
              <div>
                <strong>Inline math:</strong> Wrap with <code className="px-2 py-1 rounded" style={{backgroundColor: 'var(--background-surface)'}}>$ $</code>
                <br />
                <span className="text-xs claude-text-muted">Example: <code>$x^2 + y^2 = z^2$</code></span>
              </div>
              <div>
                <strong>Block math:</strong> Wrap with <code className="px-2 py-1 rounded" style={{backgroundColor: 'var(--background-surface)'}}>$$ $$</code>
                <br />
                <span className="text-xs claude-text-muted">Example: <code>$$\int_0^\infty e^{'{-x}'} \, dx = 1$$</code></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaTeXConverter;