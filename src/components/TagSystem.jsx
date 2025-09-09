import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { FlashcardService } from '../services/flashcardService'

// --- helpers ---
const slugify = (s) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40); // hard cap length

const useDebounced = (value, delay = 200) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

const TagSystem = ({
  selectedTags = [],
  onTagsChange,
  onClose,
  isVisible = false,
  maxSelected, // optional limit
}) => {
  const [allTags, setAllTags] = useState([]); // array of strings (normalized)
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // a11y & modal ergonomics
  const dialogRef = useRef(null);
  const debouncedSearch = useDebounced(searchTerm, 150);

  // body scroll lock + focus + ESC close
  useEffect(() => {
    if (!isVisible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => dialogRef.current?.focus(), 0);
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isVisible, onClose]);

  useEffect(() => {
    if (!isVisible) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const tags = await FlashcardService.getPopularTags(100);
        if (!mounted) return;
        const normalized = Array.from(
          new Set(
            (tags || [])
              .map(t => slugify(String(t || '')))
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        setAllTags(normalized.length ? normalized : fallbackTags());
      } catch (e) {
        console.error('Error loading tags:', e);
        if (!mounted) return;
        setAllTags(fallbackTags());
        setError('Could not load popular tags. Showing common tags.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isVisible]);

  const fallbackTags = () => ([
    'calculus','algebra','geometry','trigonometry','statistics',
    'physics','chemistry','biology','computer-science','mathematics',
    'linear-algebra','differential-equations','real-analysis','abstract-algebra',
    'topology','number-theory','combinatorics','probability','optimization',
  ]);

  const normalizedSelected = useMemo(
    () => Array.from(new Set(selectedTags.map(t => slugify(t)).filter(Boolean))),
    [selectedTags]
  );

  const canAddMore = (nextCount) =>
    typeof maxSelected === 'number' ? nextCount <= maxSelected : true;

  const handleTagToggle = useCallback((tag) => {
    const norm = slugify(tag);
    const has = normalizedSelected.includes(norm);
    const next = has
      ? normalizedSelected.filter(t => t !== norm)
      : [...normalizedSelected, norm];

    if (!canAddMore(next.length)) return; // optionally show a toast

    onTagsChange?.(next);
  }, [normalizedSelected, onTagsChange, maxSelected]);

  const handleAddCustomTag = useCallback(() => {
    const norm = slugify(newTag);
    if (!norm) return;

    // Add to library if missing
    if (!allTags.includes(norm)) {
      const merged = [...allTags, norm].sort((a, b) => a.localeCompare(b));
      setAllTags(merged);
    }

    // Add to selection if not there
    if (!normalizedSelected.includes(norm)) {
      const next = [...normalizedSelected, norm];
      if (canAddMore(next.length)) {
        onTagsChange?.(next);
      }
    }

    setNewTag('');
  }, [newTag, allTags, normalizedSelected, onTagsChange, maxSelected]);

  const handleRemoveTag = useCallback((tagToRemove) => {
    const norm = slugify(tagToRemove);
    const next = normalizedSelected.filter(t => t !== norm);
    onTagsChange?.(next);
  }, [normalizedSelected, onTagsChange]);

  const filteredTags = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter(tag => tag.includes(q));
  }, [allTags, debouncedSearch]);

  // Early return AFTER all hooks are called
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tags-title"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 id="tags-title" className="text-2xl font-bold">🏷️ Tag Management</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="text-white/90 mt-1">Organize your flashcards with tags</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* error banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-900">
              {error}
            </div>
          )}

          {/* Selected Tags */}
          {normalizedSelected.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-3">Selected Tags</h3>
              <div className="flex flex-wrap gap-2">
                {normalizedSelected.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 bg-primary-100 text-primary-800 px-3 py-2 rounded-full text-sm font-medium"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-primary-600 hover:text-primary-800 transition-colors"
                      aria-label={`Remove tag ${tag}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Tag */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-3">Add Custom Tag</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Enter new tag (e.g., linear-algebra)…"
                className="input flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                aria-label="New tag"
              />
              <button
                onClick={handleAddCustomTag}
                className="btn btn-primary whitespace-nowrap"
                disabled={!slugify(newTag)}
              >
                Add Tag
              </button>
            </div>
            {!!maxSelected && (
              <div className="text-xs text-neutral-500 mt-1">
                {normalizedSelected.length}/{maxSelected} selected
              </div>
            )}
          </div>

          {/* Search Tags */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-3">Browse Tags</h3>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tags…"
              className="input"
              aria-label="Search tags"
            />
          </div>

          {/* Available Tags */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-3">
              Available Tags ({filteredTags.length})
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-neutral-600">Loading tags…</p>
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="text-center py-8 text-neutral-600">
                No tags found matching "{debouncedSearch}"
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredTags.map(tag => {
                  const selected = normalizedSelected.includes(tag);
                  const disabled = !selected && maxSelected && normalizedSelected.length >= maxSelected;
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      disabled={disabled}
                      className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 text-left
                        ${selected
                          ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-transparent'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-pressed={selected}
                      aria-label={`Tag ${tag}`}
                      title={disabled ? 'Maximum selected' : `#${tag}`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">
              {normalizedSelected.length} tag{normalizedSelected.length !== 1 ? 's' : ''} selected
              {maxSelected ? ` • max ${maxSelected}` : ''}
            </span>
            <button onClick={onClose} className="btn btn-primary">Done</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TagSystem
