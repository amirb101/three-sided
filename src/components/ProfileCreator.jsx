import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService } from '../services/profileService';

const ProfileCreator = ({ onProfileCreated, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    institution: ''
  });
  const [currentSlug, setCurrentSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState({ state: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugCheckTimeout, setSlugCheckTimeout] = useState(null);

  // Character limits (same as old system)
  const limits = {
    displayName: 50,
    bio: 1000,
    institution: 100
  };

  // Debounced slug checking
  const checkSlugAvailability = useCallback(async (name) => {
    const slug = ProfileService.slugify(name);
    setCurrentSlug(slug);

    if (!slug) {
      setSlugStatus({ state: 'idle', message: '' });
      return;
    }

    setSlugStatus({ state: 'checking', message: 'Checking availability...' });

    try {
      const isTaken = await ProfileService.isSlugTaken(slug);
      
      if (isTaken) {
        setSlugStatus({ 
          state: 'taken', 
          message: `❌ ${slug} is already taken` 
        });
      } else {
        setSlugStatus({ 
          state: 'available', 
          message: `✅ ${slug} is available!` 
        });
      }
    } catch (error) {
      setSlugStatus({ 
        state: 'error', 
        message: '❌ Error checking availability. Please try again.' 
      });
    }
  }, []);

  // Handle name input with debounced slug check
  const handleNameChange = (value) => {
    setFormData(prev => ({ ...prev, displayName: value }));
    
    // Clear existing timeout
    if (slugCheckTimeout) {
      clearTimeout(slugCheckTimeout);
    }
    
    // Set new timeout for slug check
    const timeout = setTimeout(() => {
      checkSlugAvailability(value);
    }, 400);
    
    setSlugCheckTimeout(timeout);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to create a profile.');
      return;
    }

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

    if (!currentSlug || slugStatus.state !== 'available') {
      alert('Please wait for slug availability check or choose a different name.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Double-check slug availability
      const isTaken = await ProfileService.isSlugTaken(currentSlug);
      if (isTaken) {
        alert(`Username "${currentSlug}" was just taken. Please choose another name.`);
        await checkSlugAvailability(formData.displayName);
        return;
      }

      // Create profile
      await ProfileService.createProfile(user.uid, currentSlug, {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        institution: formData.institution.trim(),
        email: user.email
      });

      // Success!
      if (onProfileCreated) {
        onProfileCreated();
      }
      
    } catch (error) {
      console.error('Error creating profile:', error);
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (slugCheckTimeout) {
        clearTimeout(slugCheckTimeout);
      }
    };
  }, [slugCheckTimeout]);

  const isFormValid = formData.displayName.length >= 2 && 
                     formData.displayName.length <= limits.displayName &&
                     formData.bio.length <= limits.bio &&
                     formData.institution.length <= limits.institution &&
                     slugStatus.state === 'available';

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-4" style={{color: 'var(--claude-heading)'}}>
            Create Your Profile
          </h1>
          <p className="claude-text-secondary text-lg">Set up your public profile to connect with others</p>
        </div>

        {/* Form */}
        <div className="claude-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleNameChange(e.target.value)}
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
                <CharacterCount 
                  current={formData.displayName.length} 
                  max={limits.displayName}
                  label="characters"
                />
              </div>
              
              {/* Slug Preview */}
              <div className="mt-3 p-3 rounded-lg" style={{backgroundColor: 'var(--claude-subtle)'}}>
                <div className="text-sm claude-text-secondary">
                  Your profile URL: <strong>three-sided.app/profile/<span className="font-mono">{currentSlug || '...'}</span></strong>
                </div>
                {slugStatus.message && (
                  <div className={`text-sm mt-1 ${
                    slugStatus.state === 'checking' ? 'text-blue-500' :
                    slugStatus.state === 'available' ? 'text-green-500' :
                    slugStatus.state === 'taken' ? 'text-red-500' :
                    'text-red-500'
                  }`}>
                    {slugStatus.state === 'checking' && (
                      <span className="inline-flex items-center gap-2">
                        <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        {slugStatus.message}
                      </span>
                    )}
                    {slugStatus.state !== 'checking' && slugStatus.message}
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--claude-heading)'}}>
                Short Bio
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

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="flex-1 claude-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Profile...
                  </span>
                ) : (
                  'Create Profile'
                )}
              </button>
              
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--claude-subtle)',
                    color: 'var(--claude-secondary-text)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--claude-surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--claude-subtle)';
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileCreator;
