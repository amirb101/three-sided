import { useState, useEffect } from 'react';
import { FlashcardService } from '../services/flashcardService';
import { useAuth } from '../contexts/AuthContext';

const SubjectSelector = ({ value, onChange, className = "", placeholder = "Select or type a subject" }) => {
  const { user } = useAuth();
  const [existingSubjects, setExistingSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Predefined popular subjects
  const popularSubjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'History', 'English', 'Spanish', 'French', 'Psychology', 'Economics',
    'Philosophy', 'Art', 'Music', 'Geography', 'Statistics', 'Calculus',
    'Linear Algebra', 'Differential Equations', 'Organic Chemistry',
    'Molecular Biology', 'Machine Learning', 'Data Science', 'Literature',
    'World History', 'European History', 'American History', 'Political Science'
  ];

  // Load existing subjects when component mounts
  useEffect(() => {
    loadExistingSubjects();
  }, [user]);

  const loadExistingSubjects = async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get user's flashcards to extract existing subjects
      const userCards = await FlashcardService.getUserFlashcards(user.uid, 200);
      
      // Also get from legacy flashcards collection
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const legacyQuery = query(
        collection(db, 'flashcards'),
        where('userId', '==', user.uid)
      );
      const legacySnap = await getDocs(legacyQuery);
      const legacyCards = legacySnap.docs.map(d => d.data());
      
      // Combine all cards
      const allCards = [...userCards, ...legacyCards];
      
      // Extract unique subjects
      const subjectSet = new Set();
      allCards.forEach(card => {
        if (card.subject && typeof card.subject === 'string') {
          const trimmed = card.subject.trim();
          if (trimmed && trimmed !== 'General') {
            subjectSet.add(trimmed);
          }
        }
      });
      
      const sortedSubjects = Array.from(subjectSet).sort();
      setExistingSubjects(sortedSubjects);
    } catch (error) {
      console.error('Error loading existing subjects:', error);
      setExistingSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Combine and filter all subjects based on input
  const getAllSubjects = () => {
    const allSubjects = new Set([...popularSubjects, ...existingSubjects]);
    const searchTerm = value?.toLowerCase() || '';
    
    if (!searchTerm) {
      return Array.from(allSubjects).sort();
    }
    
    return Array.from(allSubjects)
      .filter(subject => subject.toLowerCase().includes(searchTerm))
      .sort((a, b) => {
        // Prioritize exact matches and starts-with matches
        const aStarts = a.toLowerCase().startsWith(searchTerm);
        const bStarts = b.toLowerCase().startsWith(searchTerm);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      });
  };

  // Handle subject selection
  const selectSubject = (subject) => {
    onChange(subject);
    setShowDropdown(false);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    onChange(e.target.value);
    setShowDropdown(true);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsInputFocused(true);
    setShowDropdown(true);
  };

  // Handle input blur
  const handleBlur = () => {
    setIsInputFocused(false);
    // Delay hiding dropdown to allow clicks
    setTimeout(() => setShowDropdown(false), 150);
  };

  const filteredSubjects = getAllSubjects();
  const hasExistingSubjects = existingSubjects.length > 0;

  return (
    <div className="relative">
      {/* Input Field */}
      <input
        type="text"
        value={value || ''}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`claude-input w-full ${className}`}
      />

      {/* Dropdown */}
      {showDropdown && (isInputFocused || value) && (
        <div 
          className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg shadow-lg border"
          style={{
            backgroundColor: 'var(--claude-surface)',
            borderColor: 'var(--claude-border)',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {isLoading ? (
            <div className="p-4 claude-text-muted text-center">
              Loading subjects...
            </div>
          ) : (
            <>
              {/* Existing Subjects Section */}
              {hasExistingSubjects && (
                <>
                  <div className="px-4 py-2 border-b border-gray-600">
                    <div className="text-sm font-medium text-purple-400">
                      📚 Your Subjects
                    </div>
                  </div>
                  {existingSubjects
                    .filter(subject => !value || subject.toLowerCase().includes(value.toLowerCase()))
                    .slice(0, 5)
                    .map((subject) => (
                      <button
                        key={`existing-${subject}`}
                        onClick={() => selectSubject(subject)}
                        className="w-full text-left px-4 py-3 hover:bg-purple-500/10 transition-colors border-b border-gray-700/50 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-purple-400">📖</span>
                          <div>
                            <div className="text-white font-medium">{subject}</div>
                            <div className="text-sm claude-text-secondary">From your cards</div>
                          </div>
                        </div>
                      </button>
                    ))}
                </>
              )}

              {/* Popular Subjects Section */}
              <div className="px-4 py-2 border-b border-gray-600">
                <div className="text-sm font-medium text-blue-400">
                  🌟 Popular Subjects
                </div>
              </div>
              
              {filteredSubjects
                .filter(subject => !existingSubjects.includes(subject))
                .slice(0, 8)
                .map((subject) => (
                  <button
                    key={`popular-${subject}`}
                    onClick={() => selectSubject(subject)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-500/10 transition-colors border-b border-gray-700/50 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-blue-400">📚</span>
                      <div>
                        <div className="text-white font-medium">{subject}</div>
                        <div className="text-sm claude-text-secondary">Popular choice</div>
                      </div>
                    </div>
                  </button>
                ))}

              {/* No Results */}
              {filteredSubjects.length === 0 && value && (
                <div className="p-4 text-center">
                  <div className="claude-text-muted mb-2">No matching subjects found</div>
                  <button
                    onClick={() => selectSubject(value)}
                    className="px-4 py-2 rounded text-sm"
                    style={{
                      backgroundColor: 'var(--claude-accent)',
                      color: 'white'
                    }}
                  >
                    Create "{value}"
                  </button>
                </div>
              )}

              {/* Custom Input Option */}
              {value && !filteredSubjects.some(s => s.toLowerCase() === value.toLowerCase()) && (
                <button
                  onClick={() => selectSubject(value)}
                  className="w-full text-left px-4 py-3 border-t border-gray-600 hover:bg-green-500/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-green-400">✨</span>
                    <div>
                      <div className="text-white font-medium">Create "{value}"</div>
                      <div className="text-sm claude-text-secondary">New custom subject</div>
                    </div>
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick Subject Buttons (when not focused) */}
      {!isInputFocused && !value && hasExistingSubjects && (
        <div className="mt-3">
          <div className="text-sm claude-text-secondary mb-2">Recent subjects:</div>
          <div className="flex flex-wrap gap-2">
            {existingSubjects.slice(0, 6).map((subject) => (
              <button
                key={subject}
                onClick={() => selectSubject(subject)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#4a5568'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--claude-accent)';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#e2e8f0';
                  e.target.style.color = '#4a5568';
                }}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectSelector;
