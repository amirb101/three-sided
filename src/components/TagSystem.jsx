import { useState, useEffect } from 'react'
import { FlashcardService } from '../services/flashcardService'

const TagSystem = ({ selectedTags = [], onTagsChange, onClose, isVisible = false }) => {
  const [allTags, setAllTags] = useState([])
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isVisible) {
      loadTags()
    }
  }, [isVisible])

  const loadTags = async () => {
    try {
      setLoading(true)
      const tags = await FlashcardService.getPopularTags(100)
      setAllTags(tags)
    } catch (error) {
      console.error('Error loading tags:', error)
      // Fallback to common tags
      setAllTags([
        'calculus', 'algebra', 'geometry', 'trigonometry', 'statistics',
        'physics', 'chemistry', 'biology', 'computer-science', 'mathematics',
        'linear-algebra', 'differential-equations', 'real-analysis', 'abstract-algebra',
        'topology', 'number-theory', 'combinatorics', 'probability', 'optimization'
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleTagToggle = (tag) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    onTagsChange(newSelectedTags)
  }

  const handleAddCustomTag = () => {
    if (newTag.trim() && !allTags.includes(newTag.trim().toLowerCase())) {
      const tagToAdd = newTag.trim().toLowerCase()
      setAllTags(prev => [...prev, tagToAdd])
      if (!selectedTags.includes(tagToAdd)) {
        onTagsChange([...selectedTags, tagToAdd])
      }
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    const newSelectedTags = selectedTags.filter(t => t !== tagToRemove)
    onTagsChange(newSelectedTags)
  }

  const filteredTags = allTags.filter(tag =>
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">🏷️ Tag Management</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-white/90 mt-1">Organize your flashcards with tags</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-3">Selected Tags</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 bg-primary-100 text-primary-800 px-3 py-2 rounded-full text-sm font-medium"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-primary-600 hover:text-primary-800 transition-colors"
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
                placeholder="Enter new tag..."
                className="input flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
              />
              <button
                onClick={handleAddCustomTag}
                className="btn btn-primary whitespace-nowrap"
                disabled={!newTag.trim()}
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Search Tags */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-3">Browse Tags</h3>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tags..."
              className="input"
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
                <p className="text-neutral-600">Loading tags...</p>
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="text-center py-8 text-neutral-600">
                No tags found matching "{searchTerm}"
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                      selectedTags.includes(tag)
                        ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-transparent'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">
              {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TagSystem
