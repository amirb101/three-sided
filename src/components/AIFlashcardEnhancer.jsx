import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import AIService from '../services/aiService';

const TABS = [
  { id: 'hints', label: 'Hints', icon: '💡' },
  { id: 'proof', label: 'Proof', icon: '📝' },
  { id: 'suggestions', label: 'Suggestions', icon: '🧠' },
  { id: 'relatedQuestions', label: 'Related Questions', icon: '❓' },
];

const idToService = {
  hints: (q, a, s) => AIService.generateHint(q, a, s),
  proof: (q, a, s) => AIService.generateProof(q, a, s),
  suggestions: (q, a, s) => AIService.generateSuggestions(q, a, s),
  relatedQuestions: (q, a, s) => AIService.generateRelatedQuestions(q, a, s),
};

const AIFlashcardEnhancer = ({ question, answer, subject, onEnhancementComplete }) => {
  const [activeTab, setActiveTab] = useState('hints');

  // Results, loading, and error per tab
  const [results, setResults] = useState({
    hints: '', proof: '', suggestions: '', relatedQuestions: '',
  });
  const [loading, setLoading] = useState({
    hints: false, proof: false, suggestions: false, relatedQuestions: false,
  });
  const [errors, setErrors] = useState({
    hints: '', proof: '', suggestions: '', relatedQuestions: '',
  });

  // Abort controllers keyed by tab
  const controllersRef = useRef({});

  // Disable generate buttons if missing I/O
  const canGenerate = Boolean(question && answer);

  // Clear content when the base inputs change (optional: keep cache if you prefer)
  useEffect(() => {
    setResults({ hints: '', proof: '', suggestions: '', relatedQuestions: '' });
    setErrors({ hints: '', proof: '', suggestions: '', relatedQuestions: '' });
    // leave loading untouched; any in-flight work will be aborted next
    Object.values(controllersRef.current).forEach(c => c?.abort?.());
    controllersRef.current = {};
  }, [question, answer, subject]);

  const setTabState = useCallback((tabId, patch) => {
    if ('result' in patch) {
      setResults(prev => ({ ...prev, [tabId]: patch.result }));
    }
    if ('loading' in patch) {
      setLoading(prev => ({ ...prev, [tabId]: patch.loading }));
    }
    if ('error' in patch) {
      setErrors(prev => ({ ...prev, [tabId]: patch.error }));
    }
  }, []);

  const generateContent = useCallback(async (type) => {
    if (!canGenerate) return;

    // Return cached content instantly to save tokens
    if (results[type] && !errors[type]) return;

    // Abort any existing request for this tab
    controllersRef.current[type]?.abort?.();

    const controller = new AbortController();
    controllersRef.current[type] = controller;

    setTabState(type, { loading: true, error: '' });

    const t0 = performance.now();
    try {
      const fn = idToService[type];
      if (!fn) throw new Error(`Unknown type: ${type}`);

      // If your AIService supports AbortSignal, pass controller.signal.
      // Otherwise it'll just be ignored.
      const content = await fn(question, answer, subject, { signal: controller.signal });

      setTabState(type, { result: content, loading: false, error: '' });

      onEnhancementComplete?.(type, content, {
        ok: true,
        elapsedMs: Math.round(performance.now() - t0),
        question, subject,
      });
    } catch (e) {
      if (e?.name === 'AbortError') return; // user switched tab/unmounted

      console.error(`Error generating ${type}:`, e);
      setTabState(type, {
        loading: false,
        error: `Error generating ${type}. Please try again.`,
      });

      onEnhancementComplete?.(type, null, {
        ok: false,
        error: String(e?.message || e),
        elapsedMs: Math.round(performance.now() - t0),
        question, subject,
      });
    } finally {
      // cleanup controller
      if (controllersRef.current[type] === controller) {
        delete controllersRef.current[type];
      }
    }
  }, [answer, canGenerate, onEnhancementComplete, question, setTabState, subject, results, errors]);

  // Generate all tabs sequentially (keeps UX simple and avoids API fan-out)
  const generateAll = useCallback(async () => {
    for (const tab of TABS) {
      // Skip tabs that already have successful content
      if (!results[tab.id] || errors[tab.id]) {
        // eslint-disable-next-line no-await-in-loop
        await generateContent(tab.id);
      }
    }
  }, [generateContent, results, errors]);

  // Abort all in-flight on unmount
  useEffect(() => {
    return () => {
      Object.values(controllersRef.current).forEach(c => c?.abort?.());
      controllersRef.current = {};
    };
  }, []);

  const activeLabel = useMemo(
    () => TABS.find(t => t.id === activeTab)?.label || '',
    [activeTab]
  );

  return (
    <div className="claude-card p-6">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--heading)'}}>🤖 AI Enhancement</h3>

      {/* Tab Navigation */}
      <div
        className="flex flex-wrap gap-2 mb-6"
        role="tablist"
        aria-label="AI enhancement sections"
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              activeTab === tab.id
                ? 'text-white'
                : 'claude-button-secondary'
            }`}
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--accent-primary)' : undefined,
              border: activeTab === tab.id ? 'none' : undefined,
              focusRingColor: 'var(--accent-primary)'
            }}
          >
            <span aria-hidden="true">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 mb-4">
        <button
          onClick={() => generateContent(activeTab)}
          disabled={!canGenerate || loading[activeTab]}
          className="claude-button-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading[activeTab] ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating {activeTab}…
            </div>
          ) : (
            `Generate ${activeLabel}`
          )}
        </button>

        <button
          onClick={generateAll}
          disabled={!canGenerate || TABS.every(t => results[t.id] && !errors[t.id])}
          className="claude-button-secondary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          title="Generate all sections sequentially"
        >
          🚀 Generate All
        </button>
      </div>

      {/* Content Area */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="space-y-3"
      >
        {/* Error */}
        {errors[activeTab] && (
          <div className="claude-alert claude-alert-error">
            {errors[activeTab]}{' '}
            <button
              className="underline hover:no-underline font-medium"
              onClick={() => generateContent(activeTab)}
              disabled={loading[activeTab]}
            >
              Retry
            </button>
          </div>
        )}

        {/* Results */}
        {results[activeTab] && !loading[activeTab] && !errors[activeTab] && (
          <div className="claude-card p-4">
            <h4 className="font-semibold mb-2" style={{color: 'var(--heading)'}}>
              {activeLabel}
            </h4>
            {/* Plain text; if you switch to markdown/MathJax, sanitize first */}
            <div className="claude-text-secondary whitespace-pre-wrap">
              {results[activeTab]}
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="text-sm claude-text-secondary p-3 rounded-lg" style={{
          backgroundColor: 'rgba(68, 90, 255, 0.1)',
          border: '1px solid rgba(68, 90, 255, 0.2)'
        }}>
          <strong style={{color: 'var(--accent-secondary)'}}>💡 Tip:</strong> Use AI enhancement to improve your flashcards with better hints,
          proofs, and suggestions.
        </div>
      </div>
    </div>
  );
};

export default AIFlashcardEnhancer;