import { useState } from 'react'
import AIService from '../services/aiService'

const LaTeXConverter = ({ onClose, isVisible = false }) => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
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
    'The absolute value of x minus 3'
  ])

  const handleConvert = async () => {
    if (!input.trim()) return

    try {
      setLoading(true)
      const result = await AIService.convertToLaTeX(input)
      setOutput(result)
    } catch (error) {
      console.error('Error converting to LaTeX:', error)
      setOutput('Error: Could not convert to LaTeX. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleExampleClick = (example) => {
    setInput(example)
  }

  const handleCopyToClipboard = async () => {
    if (output) {
      try {
        await navigator.clipboard.writeText(output)
        // Show temporary success message
        const originalText = output
        setOutput('Copied to clipboard! ✓')
        setTimeout(() => setOutput(originalText), 2000)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent-600 to-primary-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">🔄 LaTeX Converter</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
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
              <h3 className="text-xl font-semibold text-neutral-800 mb-4">Input</h3>
              
              {/* Natural Language Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Natural Language Description
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., A direct sum B, The integral from 0 to infinity of x squared dx..."
                  className="textarea h-32"
                  onKeyPress={(e) => e.key === 'Enter' && e.ctrlKey && handleConvert()}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Press Ctrl+Enter to convert
                </p>
              </div>

              {/* Convert Button */}
              <button
                onClick={handleConvert}
                disabled={!input.trim() || loading}
                className="btn btn-primary w-full mb-4"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Converting...
                  </div>
                ) : (
                  '🔄 Convert to LaTeX'
                )}
              </button>

              {/* Examples */}
              <div>
                <h4 className="text-lg font-medium text-neutral-700 mb-3">Quick Examples</h4>
                <div className="space-y-2">
                  {examples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="block w-full text-left p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Output Section */}
            <div>
              <h3 className="text-xl font-semibold text-neutral-800 mb-4">Output</h3>
              
              {/* LaTeX Output */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  LaTeX Code
                </label>
                <div className="relative">
                  <textarea
                    value={output}
                    readOnly
                    placeholder="LaTeX will appear here..."
                    className="textarea h-32 font-mono bg-neutral-50"
                  />
                  {output && (
                    <button
                      onClick={handleCopyToClipboard}
                      className="absolute top-2 right-2 p-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>

              {/* Preview */}
              {output && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Preview
                  </label>
                  <div className="bg-neutral-50 p-4 rounded-lg border-2 border-dashed border-neutral-300 min-h-[100px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📐</div>
                      <p className="text-neutral-600 text-sm">
                        LaTeX preview would render here
                      </p>
                      <p className="text-neutral-500 text-xs mt-1">
                        (MathJax integration needed)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleClear}
                  disabled={!input && !output}
                  className="btn btn-secondary w-full"
                >
                  🗑️ Clear All
                </button>
                
                <div className="text-center">
                  <p className="text-sm text-neutral-600">
                    💡 Tip: Use this tool to quickly convert mathematical expressions
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Perfect for creating flashcards with LaTeX support
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 p-4 bg-gradient-to-r from-neutral-50 to-primary-50 rounded-xl">
            <h4 className="font-semibold text-neutral-800 mb-2">How to use LaTeX in Three-Sided:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-neutral-600">
              <div>
                <strong>Inline math:</strong> Wrap with <code className="bg-white px-2 py-1 rounded">$ $</code>
                <br />
                <span className="text-xs">Example: $x^2 + y^2 = z^2$</span>
              </div>
              <div>
                <strong>Block math:</strong> Wrap with <code className="bg-white px-2 py-1 rounded">$$ $$</code>
                <br />
                <span className="text-xs">Example: $$\int_0^\infty e^{-x} dx = 1$$</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaTeXConverter
