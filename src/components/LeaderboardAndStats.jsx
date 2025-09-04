import { useState, useEffect } from 'react';
import { UserService } from '../services/userService';
import { FlashcardService } from '../services/flashcardService';
import { useAuth } from '../contexts/AuthContext';

const LeaderboardAndStats = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [timeframe, setTimeframe] = useState('allTime');

  useEffect(() => {
    loadLeaderboard();
    if (user) {
      loadUserStats();
    }
  }, [user, timeframe]);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      const topUsers = await UserService.getTopUsers(20, timeframe);
      setLeaderboard(topUsers);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      const stats = await UserService.getUserStats(user.uid);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const getTimeframeLabel = (tf) => {
    switch (tf) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'All Time';
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getAchievementIcon = (achievement) => {
    switch (achievement) {
      case 'first_card': return '🎯';
      case 'ten_cards': return '📚';
      case 'hundred_cards': return '🏆';
      case 'popular_creator': return '⭐';
      case 'study_master': return '🧠';
      case 'community_contributor': return '👥';
      default: return '🏅';
    }
  };

  const getAchievementName = (achievement) => {
    switch (achievement) {
      case 'first_card': return 'First Steps';
      case 'ten_cards': return 'Dedicated Learner';
      case 'hundred_cards': return 'Knowledge Master';
      case 'popular_creator': return 'Popular Creator';
      case 'study_master': return 'Study Master';
      case 'community_contributor': return 'Community Hero';
      default: return 'Achievement Unlocked';
    }
  };

  if (!user) {
    return (
      <div style={{
        background: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{color: '#333', marginBottom: '1rem'}}>🔐 Sign in to View Leaderboard</h3>
        <p style={{color: '#666'}}>You need to be signed in to see the leaderboard and your statistics.</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <div style={{textAlign: 'center', marginBottom: '2rem'}}>
        <h2 style={{color: '#333', marginBottom: '1rem'}}>🏆 Leaderboard & Statistics</h2>
        <p style={{color: '#666'}}>
          See how you rank among the Three-Sided community and track your progress
        </p>
      </div>

      {/* Timeframe Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {['allTime', 'year', 'month', 'week'].map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            style={{
              background: timeframe === tf ? '#007bff' : '#e9ecef',
              color: timeframe === tf ? 'white' : '#333',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            {getTimeframeLabel(tf)}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e9ecef',
        marginBottom: '2rem'
      }}>
        <button
          onClick={() => setActiveTab('leaderboard')}
          style={{
            background: 'none',
            border: 'none',
            padding: '1rem 2rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'leaderboard' ? '2px solid #007bff' : 'none',
            color: activeTab === 'leaderboard' ? '#007bff' : '#666',
            fontWeight: activeTab === 'leaderboard' ? '600' : '400'
          }}
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          style={{
            background: 'none',
            border: 'none',
            padding: '1rem 2rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'stats' ? '2px solid #007bff' : 'none',
            color: activeTab === 'stats' ? '#007bff' : '#666',
            fontWeight: activeTab === 'stats' ? '600' : '400'
          }}
        >
          📊 My Statistics
        </button>
      </div>

      {/* Tab Content */}
      <div style={{minHeight: '400px'}}>
        {activeTab === 'leaderboard' && (
          <div>
            <h3 style={{color: '#333', marginBottom: '1.5rem'}}>
              🏆 Top Contributors - {getTimeframeLabel(timeframe)}
            </h3>
            
            {isLoading ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#666'
              }}>
                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>⏳</div>
                <p>Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#666'
              }}>
                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>📊</div>
                <p>No data available for this timeframe.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '1rem'
              }}>
                {leaderboard.map((userData, index) => (
                  <div
                    key={userData.uid}
                    style={{
                      background: index < 3 ? '#fff3cd' : '#f8f9fa',
                      border: index < 3 ? '2px solid #ffc107' : '1px solid #e9ecef',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      minWidth: '50px',
                      textAlign: 'center'
                    }}>
                      {getRankIcon(index + 1)}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      flex: 1
                    }}>
                      <img
                        src={userData.photoURL || 'https://via.placeholder.com/40x40'}
                        alt={userData.displayName || 'User'}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#333',
                          fontSize: '1.1rem'
                        }}>
                          {userData.displayName || 'Anonymous User'}
                        </div>
                        <div style={{
                          color: '#666',
                          fontSize: '0.9rem'
                        }}>
                          {userData.email}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      textAlign: 'right',
                      minWidth: '120px'
                    }}>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: '#007bff'
                      }}>
                        {userData.flashcardCount || 0}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#666'
                      }}>
                        flashcards
                      </div>
                    </div>
                    
                    <div style={{
                      textAlign: 'right',
                      minWidth: '100px'
                    }}>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: '#28a745'
                      }}>
                        {userData.studySessions || 0}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#666'
                      }}>
                        sessions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h3 style={{color: '#333', marginBottom: '1.5rem'}}>📊 Your Statistics</h3>
            
            {userStats ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem'
              }}>
                {/* Basic Stats */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📚</div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#007bff',
                    marginBottom: '0.5rem'
                  }}>
                    {userStats.flashcardCount || 0}
                  </div>
                  <div style={{color: '#666'}}>Flashcards Created</div>
                </div>

                <div style={{
                  background: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>🧠</div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#28a745',
                    marginBottom: '0.5rem'
                  }}>
                    {userStats.studySessions || 0}
                  </div>
                  <div style={{color: '#666'}}>Study Sessions</div>
                </div>

                <div style={{
                  background: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>👥</div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#ffc107',
                    marginBottom: '0.5rem'
                  }}>
                    {userStats.followers || 0}
                  </div>
                  <div style={{color: '#666'}}>Followers</div>
                </div>

                <div style={{
                  background: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>⭐</div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#6f42c1',
                    marginBottom: '0.5rem'
                  }}>
                    {userStats.rating || 'N/A'}
                  </div>
                  <div style={{color: '#666'}}>Average Rating</div>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#666'
              }}>
                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>📊</div>
                <p>Loading your statistics...</p>
              </div>
            )}

            {/* Achievements */}
            {userStats && userStats.achievements && userStats.achievements.length > 0 && (
              <div style={{marginTop: '2rem'}}>
                <h4 style={{color: '#333', marginBottom: '1rem'}}>🏅 Your Achievements</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  {userStats.achievements.map((achievement, index) => (
                    <div
                      key={index}
                      style={{
                        background: '#fff3cd',
                        border: '1px solid #ffc107',
                        padding: '1rem',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>
                        {getAchievementIcon(achievement)}
                      </div>
                      <div style={{
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '0.5rem'
                      }}>
                        {getAchievementName(achievement)}
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        color: '#666'
                      }}>
                        Achievement unlocked!
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Bars */}
            {userStats && (
              <div style={{marginTop: '2rem'}}>
                <h4 style={{color: '#333', marginBottom: '1rem'}}>📈 Progress Towards Next Goals</h4>
                
                <div style={{marginBottom: '1rem'}}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{color: '#333'}}>Next Milestone: 10 Flashcards</span>
                    <span style={{color: '#666'}}>
                      {userStats.flashcardCount || 0}/10
                    </span>
                  </div>
                  <div style={{
                    background: '#e9ecef',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#007bff',
                      height: '100%',
                      width: `${Math.min(((userStats.flashcardCount || 0) / 10) * 100, 100)}%`,
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>

                <div style={{marginBottom: '1rem'}}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{color: '#333'}}>Study Goal: 5 Sessions</span>
                    <span style={{color: '#666'}}>
                      {userStats.studySessions || 0}/5
                    </span>
                  </div>
                  <div style={{
                    background: '#e9ecef',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#28a745',
                      height: '100%',
                      width: `${Math.min(((userStats.studySessions || 0) / 5) * 100, 100)}%`,
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardAndStats;
