import { useState, useEffect } from 'react';
import { ProfileService } from '../services/profileService';

const EditProfile = ({ profile, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    institution: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Character limits (same as old system)
  const limits = {
    displayName: 50,
    bio: 1000,
    institution: 100
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        institution: profile.institution || ''
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.displayName.length < 2 || formData.displayName.length > limits.displayName) {
      alert(`Display name must be between 2 and ${limits.displayName} characters.`);
      return;
    }

    if (formData.bio.length > limits.bio) {
      alert(`Bio must be ${limits.bio} characters or less.`);
      return;
    }

    if (formData.institution.length > limits.institution) {
      alert(`Institution must be ${limits.institution} characters or less.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await ProfileService.updateProfile(profile.slug, {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        institution: formData.institution.trim()
      });

      if (onSave) {
        onSave({
          ...profile,
          displayName: formData.displayName.trim(),
          bio: formData.bio.trim(),
          institution: formData.institution.trim()
        });
      }
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Character count component
  const CharacterCount = ({ current, max, label }) => {
    const percentage = (current / max) * 100;
    let className = 'text-sm ';
    
    if (percentage > 90) className += 'text-red-500';
    else if (percentage > 70) className += 'text-yellow-500';
    else className += 'text-gray-500';

    return (
      <div className={className}>
        {current}/{max} {label}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="claude-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold mb-4" style={{color: 'var(--claude-heading)'}}>
            Edit Profile
          </h2>
          <p className="claude-text-secondary">Update your public profile information</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
              Display Name *
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Enter your display name"
              maxLength={limits.displayName}
              required
              className="w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--claude-subtle)',
                borderColor: 'var(--claude-border)',
                color: 'var(--claude-primary-text)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--claude-accent)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 91, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--claude-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm claude-text-secondary">Your username @{profile?.slug} cannot be changed</div>
              <CharacterCount 
                current={formData.displayName.length} 
                max={limits.displayName}
                label="characters"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell others a bit about yourself..."
              maxLength={limits.bio}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 resize-none"
              style={{
                backgroundColor: 'var(--claude-subtle)',
                borderColor: 'var(--claude-border)',
                color: 'var(--claude-primary-text)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--claude-accent)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 91, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--claude-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm claude-text-secondary">Share your interests, expertise, or what you're studying</div>
              <CharacterCount 
                current={formData.bio.length} 
                max={limits.bio}
                label="characters"
              />
            </div>
          </div>

          {/* Institution */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
              Institution
            </label>
            <input
              type="text"
              value={formData.institution}
              onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
              placeholder="University, company, or organization (optional)"
              maxLength={limits.institution}
              className="w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--claude-subtle)',
                borderColor: 'var(--claude-border)',
                color: 'var(--claude-primary-text)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--claude-accent)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 91, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--claude-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div className="flex justify-between items-center mt-2">
              <div></div>
              <CharacterCount 
                current={formData.institution.length} 
                max={limits.institution}
                label="characters"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 claude-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--claude-subtle)',
                color: 'var(--claude-secondary-text)'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = 'var(--claude-surface-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = 'var(--claude-subtle)';
                }
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
