import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService } from '../services/profileService';
import { FriendService } from '../services/friendService';
import { FlashcardService } from '../services/flashcardService';
import EditProfile from './EditProfile';

const PublicProfile = ({ profileSlug, onClose }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [publicCards, setPublicCards] = useState([]);
  const [friendshipStatus, setFriendshipStatus] = useState(null);
  const [mutualFriends, setMutualFriends] = useState(null);
  const [stats, setStats] = useState({
    cardCount: 0,
    friendCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('upvotes');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  useEffect(() => {
    if (profileSlug) {
      loadProfile();
    }
  }, [profileSlug]);

  useEffect(() => {
    if (profile && profile.userId) {
      loadProfileData();
    }
  }, [profile, sortBy]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const profileData = await ProfileService.getProfileBySlug(profileSlug);
      if (!profileData) {
        throw new Error('Profile not found');
      }
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Profile not found or error loading profile');
      if (onClose) onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileData = async () => {
    try {
      const [cards, friendCount, friendship, mutuals] = await Promise.all([
        loadPublicCards(),
        FriendService.getFriendCount(profile.userId),
        user ? FriendService.getFriendshipStatus(user.uid, profile.userId) : null,
        user ? FriendService.getMutualFriends(user.uid, profile.userId) : null
      ]);

      setStats({
        cardCount: cards.length,
        friendCount
      });

      setFriendshipStatus(friendship);
      setMutualFriends(mutuals);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const loadPublicCards = async () => {
    try {
      // Get public cards by this user
      const cards = await FlashcardService.getPublicFlashcardsByUser(profile.userId);
      
      // Sort cards based on selected criteria
      const sortedCards = cards.sort((a, b) => {
        switch (sortBy) {
          case 'upvotes':
            return (b.upvotes || 0) - (a.upvotes || 0);
          case 'date':
            return new Date(b.createdAt) - new Date(a.createdAt);
          default:
            return 0;
        }
      });

      setPublicCards(sortedCards);
      return sortedCards;
    } catch (error) {
      console.error('Error loading public cards:', error);
      return [];
    }
  };

  const handleFriendAction = async (action) => {
    if (!user) {
      alert('Please sign in to connect with friends');
      return;
    }

    try {
      switch (action) {
        case 'send_request':
          await FriendService.sendFriendRequest(user.uid, profile.userId);
          showNotification('Friend request sent!');
          break;
        case 'accept_request':
          await FriendService.acceptFriendRequest(
            friendshipStatus.receivedRequestId,
            profile.userId,
            user.uid
          );
          showNotification('Friend request accepted!');
          break;
        case 'remove_friend':
          if (confirm(`Remove ${profile.displayName} from your friends?`)) {
            await FriendService.removeFriend(user.uid, profile.userId);
            showNotification('Friend removed');
          }
          break;
      }
      
      // Reload friendship status
      const newStatus = await FriendService.getFriendshipStatus(user.uid, profile.userId);
      setFriendshipStatus(newStatus);
      
      // Reload stats
      const friendCount = await FriendService.getFriendCount(profile.userId);
      setStats(prev => ({ ...prev, friendCount }));
      
    } catch (error) {
      console.error('Error with friend action:', error);
      showNotification('Failed to perform action', true);
    }
  };

  const showNotification = (message, isError = false) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-medium z-50 transition-transform transform translate-x-full`;
    notification.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  const getUserInitials = (displayName) => {
    if (!displayName) return '?';
    return displayName.split(' ').map(name => name.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getFriendActionButton = () => {
    if (!user || !friendshipStatus) return null;

    if (friendshipStatus.areFriends) {
      return (
        <button
          onClick={() => handleFriendAction('remove_friend')}
          className="px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          Remove Friend
        </button>
      );
    }

    if (friendshipStatus.sentRequest) {
      return (
        <span className="px-4 py-2 rounded-lg font-medium bg-yellow-100 text-yellow-800">
          Request Sent
        </span>
      );
    }

    if (friendshipStatus.receivedRequest) {
      return (
        <button
          onClick={() => handleFriendAction('accept_request')}
          className="px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
        >
          Accept Friend Request
        </button>
      );
    }

    return (
      <button
        onClick={() => handleFriendAction('send_request')}
        className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
      >
        Add Friend
      </button>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const handleEditProfile = (updatedProfile) => {
    setProfile(updatedProfile);
    setShowEditModal(false);
    showNotification('Profile updated successfully!');
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="claude-text-secondary">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--claude-heading)'}}>Profile not found</h2>
            <p className="claude-text-secondary mb-4">The profile you're looking for doesn't exist or has been removed.</p>
            {onClose && (
              <button onClick={onClose} className="claude-button-primary">
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = user && user.uid === profile.userId;

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="mb-4 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: 'var(--claude-subtle)',
              color: 'var(--claude-secondary-text)'
            }}
          >
            ← Back
          </button>
        )}

        {/* Profile Header */}
        <div className="claude-card p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Avatar & Basic Info */}
            <div className="text-center md:text-left">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto md:mx-0 mb-4"
                style={{background: 'var(--claude-accent)'}}
              >
                {getUserInitials(profile.displayName)}
              </div>
              
              <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--claude-heading)'}}>
                {profile.displayName || 'Anonymous User'}
              </h1>
              
              <p className="claude-text-secondary text-lg mb-2">@{profile.slug}</p>
              
              {profile.institution && (
                <p className="claude-text-secondary">🏫 {profile.institution}</p>
              )}
            </div>

            {/* Stats & Actions */}
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Bio */}
              {profile.bio && (
                <div className="mb-4">
                  <p className="claude-text-primary">{profile.bio}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{color: 'var(--claude-accent-blue)'}}>
                    {stats.cardCount}
                  </div>
                  <div className="claude-text-secondary text-sm">Flashcards</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{color: 'var(--claude-accent)'}}>
                    {stats.friendCount}
                  </div>
                  <div className="claude-text-secondary text-sm">Friends</div>
                </div>
              </div>

              {/* Mutual Friends */}
              {mutualFriends && mutualFriends.total > 0 && (
                <div className="mb-4 p-3 rounded-lg" style={{backgroundColor: 'var(--claude-subtle)'}}>
                  <div className="text-sm font-medium" style={{color: 'var(--claude-heading)'}}>
                    {mutualFriends.total} mutual friend{mutualFriends.total > 1 ? 's' : ''}
                  </div>
                  <div className="text-sm claude-text-secondary">
                    {mutualFriends.profiles.map(p => p.displayName).join(', ')}
                    {mutualFriends.hasMore && ` and ${mutualFriends.total - mutualFriends.profiles.length} more`}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {getFriendActionButton()}
                
                {isOwnProfile && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Public Flashcards Section */}
        <div className="claude-card p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{color: 'var(--claude-heading)'}}>
              Public Flashcards ({stats.cardCount})
            </h2>
            
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium" style={{color: 'var(--claude-secondary-text)'}}>
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 rounded-lg border"
                style={{
                  backgroundColor: 'var(--claude-subtle)',
                  borderColor: 'var(--claude-border)',
                  color: 'var(--claude-primary-text)'
                }}
              >
                <option value="upvotes">Upvotes</option>
                <option value="date">Date Created</option>
              </select>
            </div>
          </div>

          {publicCards.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>
                No public flashcards
              </h3>
              <p className="claude-text-secondary">
                {isOwnProfile 
                  ? "You haven't shared any flashcards publicly yet." 
                  : `${profile.displayName} hasn't shared any flashcards publicly yet.`
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {publicCards.map((card) => (
                <div key={card.id} className="border rounded-xl p-6 transition-all hover:shadow-md" style={{
                  backgroundColor: 'var(--claude-subtle)',
                  borderColor: 'var(--claude-border)'
                }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>
                        {card.statement || card.question || 'Untitled Card'}
                      </h3>
                      
                      {card.subject && (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                          {card.subject}
                        </span>
                      )}
                      
                      <div className="text-sm claude-text-secondary">
                        Created {formatDate(card.createdAt)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm claude-text-secondary">
                      <span>👍 {card.upvotes || 0}</span>
                      <span>👁️ {card.viewCount || 0}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {card.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--claude-border)',
                            color: 'var(--claude-secondary-text)'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Profile Modal */}
        {showEditModal && (
          <EditProfile
            profile={profile}
            onSave={handleEditProfile}
            onCancel={handleCancelEdit}
          />
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
