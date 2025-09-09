import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

// Simple in-memory cache for leaderboard data
const leaderboardCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const LeaderboardAndStats = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [communityStats, setCommunityStats] = useState({
    totalUsers: 0,
    totalCards: 0,
    totalViews: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('creators');
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    loadLeaderboard();
    loadCommunityStats();
  }, [activeTab]);

  const loadLeaderboard = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      // Use the working backend API
      let sortParam = 'upvotes';
      if (activeTab === 'creators') {
        sortParam = 'flashcards';
      } else if (activeTab === 'streak') {
        sortParam = 'streak';
      }
      
      const cacheKey = `leaderboard_${sortParam}`;
      
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = leaderboardCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          console.log('📋 Using cached leaderboard data for:', sortParam);
          setLeaderboard(cachedData.data);
          setFromCache(true);
          setIsLoading(false);
          return;
        }
      }
      
      console.log('🏆 Loading leaderboard using backend API for:', sortParam);
      
      const response = await fetch(
        `https://us-central1-three-sided-flashcard-app.cloudfunctions.net/getLeaderboard?sort=${encodeURIComponent(sortParam)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Leaderboard data loaded:', data);
      
      if (!data.leaderboard || !Array.isArray(data.leaderboard)) {
        throw new Error('Invalid leaderboard data format');
      }
      
      // Cache the data
      leaderboardCache.set(cacheKey, {
        data: data.leaderboard,
        timestamp: Date.now()
      });
      
      setLeaderboard(data.leaderboard);
      setFromCache(false);
      console.log('✅ Leaderboard loaded:', data.leaderboard.length, 'entries');
      
    } catch (error) {
      console.error('💥 Error loading leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommunityStats = async () => {
    try {
      // Count total users with profiles
      const usersQuery = query(collection(db, 'profiles'));
      const usersSnapshot = await getDocs(usersQuery);
      
      // Count total public cards
      const cardsQuery = query(collection(db, 'publicCards'));
      const cardsSnapshot = await getDocs(cardsQuery);
      
      // Calculate total views from cards
      let totalViews = 0;
      cardsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        totalViews += data.viewCount || 0;
      });
      
      setCommunityStats({
        totalUsers: usersSnapshot.size,
        totalCards: cardsSnapshot.size,
        totalViews
      });
    } catch (error) {
      console.error('Error loading community stats:', error);
    }
  };

  const getUserInitials = (displayName) => {
    if (!displayName) return '?';
    return displayName.split(' ').map(name => name.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-4" style={{color: 'var(--claude-heading)'}}>
            🏆 Community Leaderboard
          </h1>
          <p className="claude-text-secondary text-lg">Celebrating our top contributors and creators</p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="claude-card p-6 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--claude-accent-blue)'}}>{communityStats.totalUsers.toLocaleString()}</div>
            <div className="claude-text-secondary">Community Members</div>
          </div>
          
          <div className="claude-card p-6 text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--claude-accent)'}}>{communityStats.totalCards.toLocaleString()}</div>
            <div className="claude-text-secondary">Total Flashcards</div>
          </div>
          
          <div className="claude-card p-6 text-center">
            <div className="text-3xl mb-2">👁️</div>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--claude-success)'}}>{communityStats.totalViews.toLocaleString()}</div>
            <div className="claude-text-secondary">Total Views</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="claude-card p-2 mb-8">
          <div className="flex">
            {[
              { id: 'popular', label: 'Most Upvoted', icon: '🔥' },
              { id: 'creators', label: 'Top Creators', icon: '👑' },
              { id: 'streak', label: 'Login Streak', icon: '⚡' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--claude-accent)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--claude-secondary-text)'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = 'var(--claude-surface-hover)';
                    e.target.style.color = 'var(--claude-primary-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--claude-secondary-text)';
                  }
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="claude-card p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{color: 'var(--claude-heading)'}}>
              {activeTab === 'creators' ? '👑 Top Creators' : activeTab === 'popular' ? '🔥 Most Upvoted' : '⚡ Login Streak Champions'}
            </h2>
            <div className="flex items-center gap-3">
              {fromCache && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                  📋 Cached
                </span>
              )}
              <button
                onClick={() => loadLeaderboard(true)}
                className="claude-button-primary"
                title="Force refresh from server (bypasses cache)"
              >
                Refresh
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({length: 10}).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl animate-pulse" style={{backgroundColor: 'var(--claude-subtle)'}}>
                  <div className="w-12 h-12 rounded-full" style={{backgroundColor: 'var(--claude-border)'}}></div>
                  <div className="flex-1">
                    <div className="h-4 rounded mb-2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                    <div className="h-3 rounded w-1/2" style={{backgroundColor: 'var(--claude-border)'}}></div>
                  </div>
                  <div className="w-16 h-8 rounded" style={{backgroundColor: 'var(--claude-border)'}}></div>
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--claude-heading)'}}>No users found</h3>
              <p className="claude-text-muted">Be the first to create some flashcards!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <div key={user.slug || user.id} className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-105" style={{
                  backgroundColor: index < 3 
                    ? 'rgba(255, 215, 0, 0.1)' 
                    : 'var(--claude-subtle)',
                  border: `1px solid ${index < 3 ? 'rgba(255, 215, 0, 0.3)' : 'var(--claude-border)'}`,
                }}>
                  
                  {/* Rank */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                    style={{
                      background: index < 3 
                        ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' 
                        : 'var(--claude-muted)',
                      color: index < 3 ? 'white' : 'var(--claude-background)'
                    }}
                  >
                    {getRankIcon(index)}
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
                      <h3 className="font-semibold" style={{color: 'var(--claude-heading)'}}>{user.displayName || 'Anonymous'}</h3>
                      {user.slug && (
                        <a 
                          href={`/profile/${user.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm transition-colors hover:underline"
                          style={{color: 'var(--claude-accent)'}}
                        >
                          @{user.slug}
                        </a>
                      )}
                    </div>
                    <div className="claude-text-muted text-sm">
                      {activeTab === 'creators' 
                        ? `${user.flashcardCount || 0} flashcards created`
                        : activeTab === 'popular'
                        ? `${user.upvotesReceived || 0} upvotes received`
                        : `${user.loginStreak || 0} day login streak`
                      }
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <div 
                      className="text-2xl font-bold"
                      style={{color: index < 3 ? '#B8860B' : 'var(--claude-accent-blue)'}}
                    >
                      {activeTab === 'creators' 
                        ? (user.flashcardCount || 0) 
                        : activeTab === 'popular'
                        ? (user.upvotesReceived || 0)
                        : (user.loginStreak || 0)
                      }
                    </div>
                    <div className="claude-text-muted text-sm">
                      {activeTab === 'creators' ? 'cards' : activeTab === 'popular' ? 'upvotes' : 'day streak'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current User Position */}
        {user && (
          <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Position</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {getUserInitials(user.displayName)}
                </div>
                <div>
                  <div className="font-medium text-white">{user.displayName}</div>
                  <div className="text-slate-400 text-sm">That's you!</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">
                  #{leaderboard.findIndex(u => u.id === user.uid) + 1 || 'Unranked'}
                </div>
                <div className="text-slate-400 text-sm">Position</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardAndStats;