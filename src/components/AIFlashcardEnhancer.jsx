import { useState } from 'react';
import AIService from '../services/aiService';

const AIFlashcardEnhancer = ({ question, answer, subject, onEnhancementComplete }) => {
  const [activeTab, setActiveTab] = useState('hints');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    hints: '',
    proof: '',
    suggestions: '',
    relatedQuestions: ''
  });

  const generateContent = async (type) => {
    if (!question || !answer) return;
    
    setLoading(true);
    try {
      let result = '';
      
      switch (type) {
        case 'hints':
          result = await AIService.generateHint(question, answer);
          break;
        case 'proof':
          result = await AIService.generateProof(question, answer);
          break;
        case 'suggestions':
          result = await AIService.generateSuggestions(question, answer);
          break;
        case 'relatedQuestions':
          result = await AIService.generateRelatedQuestions(question, answer);
          break;
        default:
          break;
      }
      
      setResults(prev => ({
        ...prev,
        [type]: result
      }));
      
      if (onEnhancementComplete) {
        onEnhancementComplete(type, result);
      }
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      setResults(prev => ({
        ...prev,
        [type]: `Error generating ${type}. Please try again.`
      }));
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'hints', label: 'Hints', icon: '💡' },
    { id: 'proof', label: 'Proof', icon: '📝' },
    { id: 'suggestions', label: 'Suggestions', icon: '💡' },
    { id: 'relatedQuestions', label: 'Related Questions', icon: '❓' }
  ];

  return (
    <div className="card p-6">
      <h3 className="text-xl font-bold text-neutral-800 mb-4">🤖 AI Enhancement</h3>
      
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-transparent'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {/* Generate Button */}
        <button
          onClick={() => generateContent(activeTab)}
          disabled={loading || !question || !answer}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Generating {activeTab}...
            </div>
          ) : (
            `Generate ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`
          )}
        </button>

        {/* Results Display */}
        {results[activeTab] && (
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <h4 className="font-semibold text-neutral-800 mb-2">
              {tabs.find(tab => tab.id === activeTab)?.label}
            </h4>
            <div className="text-neutral-700 whitespace-pre-wrap">
              {results[activeTab]}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-neutral-600 bg-blue-50 p-3 rounded-lg">
          <strong>💡 Tip:</strong> Use AI enhancement to improve your flashcards with better hints, proofs, and suggestions.
        </div>
      </div>
    </div>
  );
};

export default AIFlashcardEnhancer;
