import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FriendService } from '../services/friendService';
import { ProfileService } from '../services/profileService';
import { FlashcardService } from '../services/flashcardService';

const SocialHub = ({ onViewProfile }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState({
    friendCount: 0,
    requestCount: 0,
    sharedCardsCount: 0,
    mutualConnections: 0
  });

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  useEffect(() => {
    switch (activeTab) {
      case 'friends':
        loadFriends();
        break;
      case 'requests':
        loadFriendRequests();
        break;
      case 'leaderboard':
        loadLeaderboard();
        break;
      default:
        break;
    }
  }, [activeTab]);

  const loadInitialData = async () => {
    try {
      const [friendCount, requests, sharedCards] = await Promise.all([
        FriendService.getFriendCount(user.uid),
        FriendService.getFriendRequests(user.uid),
        FlashcardService.getPublicFlashcardsByUser(user.uid)
      ]);

      setStats(prev => ({
        ...prev,
        friendCount,
        requestCount: requests.length,
        sharedCardsCount: sharedCards.length
      }));
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const friendsList = await FriendService.getFriends(user.uid);
      setFriends(friendsList);
      setStats(prev => ({ ...prev, friendCount: friendsList.length }));
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    setIsLoading(true);
    try {
      const requests = await FriendService.getFriendRequests(user.uid);
      setFriendRequests(requests);
      setStats(prev => ({ ...prev, requestCount: requests.length }));
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      const results = await ProfileService.searchProfiles(searchTerm);
      
      // Filter out current user and add friendship status
      const filteredResults = results.filter(result => result.userId !== user.uid);
      
      const resultsWithStatus = await Promise.all(
        filteredResults.map(async (result) => {
          const status = await FriendService.getFriendshipStatus(user.uid, result.userId);
          const mutualFriends = await FriendService.getMutualFriends(user.uid, result.userId);
          
          return {
            ...result,
            friendshipStatus: status,
            mutualFriends
          };
        })
      );

      setSearchResults(resultsWithStatus);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await FriendService.sendFriendRequest(user.uid, userId);
      showNotification('Friend request sent!');
      
      // Refresh search results
      if (searchTerm) {
        await searchUsers();
      }
      await loadInitialData();
    } catch (error) {
      console.error('Error sending friend request:', error);
      showNotification('Failed to send friend request', true);
    }
  };

  const handleAcceptFriendRequest = async (request) => {
    try {
      await FriendService.acceptFriendRequest(request.id, request.fromId, user.uid);
      showNotification('Friend request accepted!');
      
      await loadFriendRequests();
      await loadInitialData();
      
      if (activeTab === 'friends') {
        await loadFriends();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showNotification('Failed to accept friend request', true);
    }
  };

  const handleRejectFriendRequest = async (requestId) => {
    try {
      await FriendService.rejectFriendRequest(requestId);
      showNotification('Friend request declined');
      
      await loadFriendRequests();
      await loadInitialData();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      showNotification('Failed to reject friend request', true);
    }
  };

  const handleRemoveFriend = async (friendId, friendName) => {
    if (!confirm(`Remove ${friendName} from your friends?`)) return;

    try {
      await FriendService.removeFriend(user.uid, friendId);
      showNotification('Friend removed');
      
      await loadFriends();
      await loadInitialData();
    } catch (error) {
      console.error('Error removing friend:', error);
      showNotification('Failed to remove friend', true);
    }
  };

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      // Get current user's friends
      const friendIds = await FriendService.getFriendIds(user.uid);
      const allIds = [user.uid, ...friendIds];
      
      // Get profiles for all users (user + friends)
      const profiles = [];
      for (const userId of allIds) {
        const profile = await ProfileService.getProfileByUserId(userId);
        if (profile) {
          profiles.push({ ...profile, userId });
        }
      }
      
      // Get friend counts for each user
      const leaderboardData = await Promise.all(
        profiles.map(async (profile) => {
          const friendCount = await FriendService.getFriendCount(profile.userId);
          return {
            ...profile,
            friendCount,
            isCurrentUser: profile.userId === user.uid
          };
        })
      );
      
      // Sort by friend count (descending)
      leaderboardData.sort((a, b) => b.friendCount - a.friendCount);
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, isError = false) => {
    // Simple notification - could be enhanced with toast library
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-medium z-50 transition-transform transform translate-x-full`;
    notification.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
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

  const renderUserCard = (user, friendshipStatus, mutualFriends, showActions = true) => {
    const getActionButton = () => {
      if (!showActions) return null;

      if (friendshipStatus?.areFriends) {
        return (
          <button
            onClick={() => handleRemoveFriend(user.userId, user.displayName)}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Remove
          </button>
        );
      }

      if (friendshipStatus?.sentRequest) {
        return (
          <span className="px-3 py-1 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-800">
            Request Sent
          </span>
        );
      }

      if (friendshipStatus?.receivedRequest) {
        return (
          <button
            onClick={() => handleAcceptFriendRequest({
              id: friendshipStatus.receivedRequestId,
              fromId: user.userId
            })}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            Accept
          </button>
        );
      }

      return (
        <button
          onClick={() => handleSendFriendRequest(user.userId)}
          className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Add Friend
        </button>
      );
    };

    const getFriendshipStatusBadge = () => {
      if (friendshipStatus?.areFriends) {
        return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Friends</span>;
      }
      if (friendshipStatus?.sentRequest) {
        return <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Pending</span>;
      }
      if (friendshipStatus?.receivedRequest) {
        return <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">Wants to connect</span>;
      }
      return null;
    };

    return (
      <div key={user.userId} className="claude-card p-4 hover:scale-[1.02] transition-transform">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{background: 'var(--claude-accent)'}}
            >
              {getUserInitials(user.displayName)}
            </div>
            
            {/* User Info */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold" style={{color: 'var(--claude-heading)'}}>
                  {onViewProfile && user.slug ? (
                    <button
                      onClick={() => onViewProfile(user.slug)}
                      className="hover:underline transition-colors"
                      style={{color: 'var(--claude-heading)'}}
                    >
                      {user.displayName || 'Unknown User'}
                    </button>
                  ) : (
                    user.displayName || 'Unknown User'
                  )}
                </h3>
                {getFriendshipStatusBadge()}
              </div>
              
              <div className="text-sm claude-text-secondary space-y-1">
                {user.email && <div>{user.email}</div>}
                {user.institution && <div>🏫 {user.institution}</div>}
                {mutualFriends?.total > 0 && (
                  <div className="text-green-600 font-medium">
                    {mutualFriends.total} mutual friend{mutualFriends.total > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {getActionButton()}
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'friends', label: 'My Friends', icon: '👥' },
    { id: 'discover', label: 'Discover', icon: '🔍' },
    { id: 'requests', label: 'Requests', icon: '📬', badge: stats.requestCount },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-4" style={{color: 'var(--claude-heading)'}}>
            👥 Friends & Social
          </h1>
          <p className="claude-text-secondary text-lg">Connect with fellow learners and share your progress</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="claude-card p-6 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--claude-accent-blue)'}}>
              {stats.friendCount}
            </div>
            <div className="claude-text-secondary">Friends</div>
          </div>
          
          <div className="claude-card p-6 text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--claude-accent)'}}>
              {stats.sharedCardsCount}
            </div>
            <div className="claude-text-secondary">Cards Shared</div>
          </div>
          
          <div className="claude-card p-6 text-center">
            <div className="text-3xl mb-2">📬</div>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--claude-success)'}}>
              {stats.requestCount}
            </div>
            <div className="claude-text-secondary">Pending Requests</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="claude-card p-2 mb-8">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 relative"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--claude-accent)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--claude-secondary-text)'
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="claude-card p-8">
          
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--claude-heading)'}}>
                👥 My Friends ({stats.friendCount})
              </h2>
              
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="animate-pulse claude-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full" style={{backgroundColor: 'var(--claude-border)'}}></div>
                        <div className="flex-1">
                          <div className="h-4 rounded mb-2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                          <div className="h-3 rounded w-1/2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>No friends yet</h3>
                  <p className="claude-text-secondary">Search for users to add your first friend!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {friends.map(friend => renderUserCard(
                    friend, 
                    { areFriends: true }, 
                    null, 
                    true
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Discover Tab */}
          {activeTab === 'discover' && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--claude-heading)'}}>
                🔍 Discover Users
              </h2>
              
              {/* Search Bar */}
              <div className="flex gap-4 mb-6">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                  placeholder="Search by email or display name..."
                  className="flex-1 px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--claude-subtle)',
                    borderColor: 'var(--claude-border)',
                    color: 'var(--claude-primary-text)'
                  }}
                />
                <button
                  onClick={searchUsers}
                  disabled={!searchTerm.trim() || isLoading}
                  className="claude-button-primary disabled:opacity-50"
                >
                  {isLoading ? '⏳' : '🔍'} Search
                </button>
              </div>

              <p className="text-sm claude-text-secondary mb-6">
                💡 Tip: Search by email address or display name for best results
              </p>
              
              {/* Search Results */}
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="animate-pulse claude-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full" style={{backgroundColor: 'var(--claude-border)'}}></div>
                        <div className="flex-1">
                          <div className="h-4 rounded mb-2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                          <div className="h-3 rounded w-1/2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length === 0 && searchTerm ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">😔</div>
                  <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>No users found</h3>
                  <p className="claude-text-secondary">Try searching with a different email or username</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>Discover new friends</h3>
                  <p className="claude-text-secondary">Search for users to connect with and share your learning journey!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map(result => renderUserCard(
                    result, 
                    result.friendshipStatus, 
                    result.mutualFriends, 
                    true
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--claude-heading)'}}>
                📬 Friend Requests ({stats.requestCount})
              </h2>
              
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({length: 2}).map((_, i) => (
                    <div key={i} className="animate-pulse claude-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full" style={{backgroundColor: 'var(--claude-border)'}}></div>
                        <div className="flex-1">
                          <div className="h-4 rounded mb-2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                          <div className="h-3 rounded w-1/2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : friendRequests.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📬</div>
                  <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>No pending requests</h3>
                  <p className="claude-text-secondary">You're all caught up! New friend requests will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {friendRequests.map(request => (
                    <div key={request.id} className="claude-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                            style={{background: 'var(--claude-accent)'}}
                          >
                            {getUserInitials(request.senderProfile.displayName)}
                          </div>
                          
                          <div>
                            <h3 className="font-semibold" style={{color: 'var(--claude-heading)'}}>
                              {request.senderProfile.displayName || 'Unknown User'}
                            </h3>
                            <div className="text-sm claude-text-secondary">
                              Wants to connect with you
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptFriendRequest(request)}
                            className="px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectFriendRequest(request.id)}
                            className="px-4 py-2 rounded-lg font-medium bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--claude-heading)'}}>
                🏆 Friends Leaderboard
              </h2>
              <p className="claude-text-secondary mb-6">Top learners among you and your friends</p>
              
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({length: 5}).map((_, i) => (
                    <div key={i} className="animate-pulse claude-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full" style={{backgroundColor: 'var(--claude-border)'}}></div>
                        <div className="w-12 h-12 rounded-full" style={{backgroundColor: 'var(--claude-border)'}}></div>
                        <div className="flex-1">
                          <div className="h-4 rounded mb-2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                          <div className="h-3 rounded w-1/2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                        </div>
                        <div className="w-16 h-8 rounded" style={{backgroundColor: 'var(--claude-border)'}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>No leaderboard data</h3>
                  <p className="claude-text-secondary">Add some friends to see the leaderboard!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((user, index) => (
                    <div 
                      key={user.userId} 
                      className={`claude-card p-4 transition-all duration-300 hover:scale-[1.02] ${
                        user.isCurrentUser ? 'ring-2 ring-blue-500 bg-blue-50/10' : ''
                      }`}
                      style={{
                        backgroundColor: index < 3 && !user.isCurrentUser 
                          ? 'rgba(255, 215, 0, 0.1)' 
                          : user.isCurrentUser 
                          ? 'rgba(59, 130, 246, 0.1)'
                          : 'var(--claude-surface)',
                        border: `1px solid ${
                          index < 3 && !user.isCurrentUser 
                            ? 'rgba(255, 215, 0, 0.3)' 
                            : user.isCurrentUser
                            ? 'rgba(59, 130, 246, 0.3)'
                            : 'var(--claude-border)'
                        }`
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                          style={{
                            background: index < 3 
                              ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' 
                              : 'var(--claude-muted)',
                            color: index < 3 ? 'white' : 'var(--claude-text)'
                          }}
                        >
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>

                        {/* Avatar */}
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                          style={{background: 'var(--claude-accent)'}}
                        >
                          {getUserInitials(user.displayName)}
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" style={{color: 'var(--claude-heading)'}}>
                              {user.displayName || 'Unknown User'}
                              {user.isCurrentUser && (
                                <span className="ml-2 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                  You
                                </span>
                              )}
                            </h3>
                            {user.slug && (
                              <button
                                onClick={() => onViewProfile && onViewProfile(user.slug)}
                                className="text-sm transition-colors hover:underline"
                                style={{color: 'var(--claude-accent)'}}
                              >
                                @{user.slug}
                              </button>
                            )}
                          </div>
                          <div className="claude-text-secondary text-sm">
                            {user.institution && `🏫 ${user.institution}`}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right">
                          <div 
                            className="text-xl font-bold"
                            style={{color: index < 3 ? '#FFD700' : 'var(--claude-accent-blue)'}}
                          >
                            {user.friendCount}
                          </div>
                          <div className="claude-text-secondary text-sm">
                            friend{user.friendCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialHub;
