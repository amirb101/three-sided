import { useState, useEffect } from 'react';
import { UserService } from '../services/userService';
import { FlashcardService } from '../services/flashcardService';
import { useAuth } from '../contexts/AuthContext';

const UserDashboard = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [userFlashcards, setUserFlashcards] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [studyHistory, setStudyHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    subjects: '',
    studyGoals: ''
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const [profile, cards, favs, history] = await Promise.all([
        UserService.getUserProfile(user.uid),
        FlashcardService.getUserFlashcards(user.uid),
        FlashcardService.getUserFavorites(user.uid),
        UserService.getStudyHistory(user.uid)
      ]);
      
      setUserProfile(profile);
      setUserFlashcards(cards);
      setFavorites(favs);
      setStudyHistory(history);
      
      if (profile) {
        setEditForm({
          displayName: profile.displayName || '',
          bio: profile.bio || '',
          subjects: profile.subjects ? profile.subjects.join(', ') : '',
          studyGoals: profile.studyGoals || ''
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileEdit = async () => {
    try {
      const updatedProfile = {
        ...userProfile,
        displayName: editForm.displayName,
        bio: editForm.bio,
        subjects: editForm.subjects.split(',').map(s => s.trim()).filter(s => s),
        studyGoals: editForm.studyGoals
      };
      
      await UserService.updateUserProfile(user.uid, updatedProfile);
      setUserProfile(updatedProfile);
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleDeleteFlashcard = async (cardId) => {
    if (window.confirm('Are you sure you want to delete this flashcard?')) {
      try {
        await FlashcardService.deleteFlashcard(cardId);
        setUserFlashcards(prev => prev.filter(card => card.id !== cardId));
      } catch (error) {
        console.error('Error deleting flashcard:', error);
      }
    }
  };

  const handleRemoveFavorite = async (cardId) => {
    try {
      await FlashcardService.removeFromFavorites(user.uid, cardId);
      setFavorites(prev => prev.filter(card => card.id !== cardId));
    } catch (error) {
      console.error('Error removing favorite:', error);
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
        <h3 style={{color: '#333', marginBottom: '1rem'}}>🔐 Sign in to Access Dashboard</h3>
        <p style={{color: '#666'}}>You need to be signed in to view your personal dashboard.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        background: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{color: '#333', marginBottom: '1rem'}}>⏳ Loading Dashboard...</h3>
        <p style={{color: '#666'}}>Please wait while we load your data.</p>
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
        <h2 style={{color: '#333', marginBottom: '1rem'}}>🎯 Your Dashboard</h2>
        <p style={{color: '#666'}}>
          Manage your flashcards, track your progress, and customize your profile
        </p>
      </div>

      {/* Profile Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        flexWrap: 'wrap'
      }}>
        <img
          src={user.photoURL || 'https://via.placeholder.com/80x80'}
          alt={user.displayName || 'User'}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid rgba(255,255,255,0.3)'
          }}
        />
        <div style={{flex: 1}}>
          <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.5rem'}}>
            {userProfile?.displayName || user.displayName || 'Anonymous User'}
          </h3>
          <p style={{margin: '0 0 1rem 0', opacity: 0.9}}>
            {userProfile?.bio || 'No bio yet. Click edit to add one!'}
          </p>
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {isEditingProfile ? 'Cancel Edit' : '✏️ Edit Profile'}
          </button>
        </div>
      </div>

      {/* Profile Edit Form */}
      {isEditingProfile && (
        <div style={{
          background: '#f8f9fa',
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h3 style={{color: '#333', marginBottom: '1rem'}}>Edit Profile</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#333'
              }}>
                Display Name
              </label>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm(prev => ({...prev, displayName: e.target.value}))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#333'
              }}>
                Subjects (comma-separated)
              </label>
              <input
                type="text"
                value={editForm.subjects}
                onChange={(e) => setEditForm(prev => ({...prev, subjects: e.target.value}))}
                placeholder="e.g., Mathematics, Physics, Chemistry"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>
          <div style={{marginBottom: '1.5rem'}}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              Bio
            </label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm(prev => ({...prev, bio: e.target.value}))}
              placeholder="Tell us about yourself and your study goals..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setIsEditingProfile(false)}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleProfileEdit}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e9ecef',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {['overview', 'my-cards', 'favorites', 'study-history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              padding: '1rem 1.5rem',
              cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #007bff' : 'none',
              color: activeTab === tab ? '#007bff' : '#666',
              fontWeight: activeTab === tab ? '600' : '400',
              fontSize: '0.9rem'
            }}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'my-cards' && '📚 My Cards'}
            {tab === 'favorites' && '⭐ Favorites'}
            {tab === 'study-history' && '📈 Study History'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{minHeight: '400px'}}>
        {activeTab === 'overview' && (
          <div>
            <h3 style={{color: '#333', marginBottom: '1.5rem'}}>📊 Dashboard Overview</h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
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
                  {userFlashcards.length}
                </div>
                <div style={{color: '#666'}}>My Flashcards</div>
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
                  color: '#ffc107',
                  marginBottom: '0.5rem'
                }}>
                  {favorites.length}
                </div>
                <div style={{color: '#666'}}>Favorites</div>
              </div>

              <div style={{
                background: '#f8f9fa',
                padding: '1.5rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📈</div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#28a745',
                  marginBottom: '0.5rem'
                }}>
                  {studyHistory.length}
                </div>
                <div style={{color: '#666'}}>Study Sessions</div>
              </div>

              <div style={{
                background: '#f8f9fa',
                padding: '1.5rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>🎯</div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#6f42c1',
                  marginBottom: '0.5rem'
                }}>
                  {userProfile?.subjects?.length || 0}
                </div>
                <div style={{color: '#666'}}>Subjects</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 style={{color: '#333', marginBottom: '1rem'}}>🆕 Recent Activity</h4>
              {studyHistory.length > 0 ? (
                <div style={{
                  background: '#f8f9fa',
                  padding: '1rem',
                  borderRadius: '8px'
                }}>
                  <div style={{color: '#666', fontSize: '0.9rem'}}>
                    Last studied: {studyHistory[0]?.date || 'Never'}
                  </div>
                  <div style={{color: '#666', fontSize: '0.9rem'}}>
                    Total study time: {studyHistory.reduce((total, session) => total + (session.duration || 0), 0)} minutes
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#f8f9fa',
                  padding: '1rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  No study sessions yet. Start studying to see your progress!
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my-cards' && (
          <div>
            <h3 style={{color: '#333', marginBottom: '1.5rem'}}>📚 My Flashcards</h3>
            
            {userFlashcards.length === 0 ? (
              <div style={{
                background: '#f8f9fa',
                padding: '2rem',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#666'
              }}>
                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>📚</div>
                <p>You haven't created any flashcards yet.</p>
                <p>Start creating to build your knowledge collection!</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {userFlashcards.map((card, index) => (
                  <div
                    key={card.id}
                    style={{
                      background: '#f8f9fa',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      position: 'relative'
                    }}
                  >
                    <h4 style={{
                      color: '#333',
                      marginBottom: '0.5rem',
                      fontSize: '1.1rem'
                    }}>
                      {card.question.length > 100 
                        ? card.question.substring(0, 100) + '...' 
                        : card.question
                      }
                    </h4>
                    <p style={{
                      color: '#666',
                      marginBottom: '1rem',
                      fontSize: '0.9rem'
                    }}>
                      {card.answer.length > 150 
                        ? card.answer.substring(0, 150) + '...' 
                        : card.answer
                      }
                    </p>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: '#666'
                    }}>
                      <span>Subject: {card.subject || 'Not specified'}</span>
                      <span>Difficulty: {card.difficulty || 'Not specified'}</span>
                    </div>
                    {card.tags && card.tags.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.25rem',
                        marginTop: '0.5rem'
                      }}>
                        {card.tags.slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            style={{
                              background: '#e9ecef',
                              color: '#495057',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.7rem'
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteFlashcard(card.id)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            <h3 style={{color: '#333', marginBottom: '1.5rem'}}>⭐ My Favorites</h3>
            
            {favorites.length === 0 ? (
              <div style={{
                background: '#f8f9fa',
                padding: '2rem',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#666'
              }}>
                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>⭐</div>
                <p>You haven't favorited any flashcards yet.</p>
                <p>Browse the community collection and save your favorites!</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {favorites.map((card, index) => (
                  <div
                    key={card.id}
                    style={{
                      background: '#f8f9fa',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      position: 'relative'
                    }}
                  >
                    <h4 style={{
                      color: '#333',
                      marginBottom: '0.5rem',
                      fontSize: '1.1rem'
                    }}>
                      {card.question.length > 100 
                        ? card.question.substring(0, 100) + '...' 
                        : card.question
                      }
                    </h4>
                    <p style={{
                      color: '#666',
                      marginBottom: '1rem',
                      fontSize: '0.9rem'
                    }}>
                      {card.answer.length > 150 
                        ? card.answer.substring(0, 150) + '...' 
                        : card.answer
                      }
                    </p>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: '#666'
                    }}>
                      <span>Subject: {card.subject || 'Not specified'}</span>
                      <span>Difficulty: {card.difficulty || 'Not specified'}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFavorite(card.id)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: '#ffc107',
                        color: '#333',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'study-history' && (
          <div>
            <h3 style={{color: '#333', marginBottom: '1.5rem'}}>📈 Study History</h3>
            
            {studyHistory.length === 0 ? (
              <div style={{
                background: '#f8f9fa',
                padding: '2rem',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#666'
              }}>
                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>📈</div>
                <p>No study sessions recorded yet.</p>
                <p>Start studying to track your progress!</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '1rem'
              }}>
                {studyHistory.map((session, index) => (
                  <div
                    key={index}
                    style={{
                      background: '#f8f9fa',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        Study Session #{studyHistory.length - index}
                      </div>
                      <div style={{
                        color: '#666',
                        fontSize: '0.9rem'
                      }}>
                        {session.date || 'Unknown date'}
                      </div>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem',
                      fontSize: '0.9rem',
                      color: '#666'
                    }}>
                      <div>Duration: {session.duration || 0} minutes</div>
                      <div>Cards Studied: {session.cardsStudied || 0}</div>
                      <div>Accuracy: {session.accuracy || 'N/A'}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
