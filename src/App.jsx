import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { UserService } from './services/userService'
import FlashcardCreator from './components/FlashcardCreator'
import StudyMode from './components/StudyMode'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [currentMode, setCurrentMode] = useState('home') // 'home', 'create', 'study'
  const [onboardingStatus, setOnboardingStatus] = useState({
    hasProfile: false,
    hasCards: false
  })
  const { user, signInWithGoogle, logout } = useAuth()

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const status = await UserService.checkOnboardingStatus(user.uid);
      setOnboardingStatus(status);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleChecklistClick = async (step) => {
    if (!user) {
      await handleSignIn();
      return;
    }

    if (step === 'profile' && !onboardingStatus.hasProfile) {
      // Create user profile
      try {
        await UserService.createUserProfile(user.uid, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
        await checkOnboardingStatus();
      } catch (error) {
        console.error('Error creating profile:', error);
      }
    }
  };

  const handleCardCreated = async (cardId) => {
    await checkOnboardingStatus();
    setCurrentMode('home');
  };

  const renderContent = () => {
    switch (currentMode) {
      case 'create':
        return (
          <FlashcardCreator 
            onCardCreated={handleCardCreated}
            onClose={() => setCurrentMode('home')}
          />
        );
      case 'study':
        return <StudyMode />;
      default:
        return renderHomeContent();
    }
  };

  const renderHomeContent = () => (
    <>
      {/* Hero Section */}
      <section className="hero-section" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div className="hero-content">
          <h1 className="hero-title" style={{fontSize: '3rem', marginBottom: '1rem'}}>Three-Sided</h1>
          <p className="hero-subtitle" style={{fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9}}>
            Join a community of STEM students sharing and studying flashcards together. 
            Create, discover, and learn from thousands of user-generated cards with AI-powered assistance.
          </p>
          <div className="hero-cta">
            <a href="/search.html" className="btn btn-primary" style={{
              background: '#007bff',
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '6px',
              textDecoration: 'none',
              margin: '0 0.5rem',
              display: 'inline-block'
            }}>
              🔍 Search Flashcards
            </a>
            <a href="/updates.html" className="btn btn-secondary" style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '6px',
              textDecoration: 'none',
              margin: '0 0.5rem',
              display: 'inline-block',
              border: '2px solid rgba(255,255,255,0.3)'
            }}>
              📋 What's New?
            </a>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="main-content" style={{padding: '2rem', maxWidth: '1200px', margin: '0 auto'}}>
        <div className="container">
          {/* Quick Actions */}
          {user && (
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <h2 style={{color: '#333', marginBottom: '1.5rem'}}>🚀 Quick Actions</h2>
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setCurrentMode('create')}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  ✏️ Create Flashcard
                </button>
                <button
                  onClick={() => setCurrentMode('study')}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  📚 Study Mode
                </button>
              </div>
            </div>
          )}

          {/* Features Grid */}
          <div className="features-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem'
          }}>
            <div className="feature-card" style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div className="feature-icon" style={{fontSize: '3rem', marginBottom: '1rem'}}>👥</div>
              <h3 className="feature-title" style={{fontSize: '1.5rem', marginBottom: '1rem', color: '#333'}}>Community-Driven</h3>
              <p className="feature-description" style={{color: '#666', lineHeight: '1.6'}}>Discover and share flashcards with students worldwide. Learn from the community's collective knowledge.</p>
            </div>
            
            <div className="feature-card" style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div className="feature-icon" style={{fontSize: '3rem', marginBottom: '1rem'}}>🧠</div>
              <h3 className="feature-title" style={{fontSize: '1.5rem', marginBottom: '1rem', color: '#333'}}>AI-Powered Assistance</h3>
              <p className="feature-description" style={{color: '#666', lineHeight: '1.6'}}>Get AI-generated hints and proofs to help you create better flashcards faster.</p>
            </div>
            
            <div className="feature-card" style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <a href="/latex_guide.html" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="feature-icon" style={{fontSize: '3rem', marginBottom: '1rem'}}>📐</div>
                <h3 className="feature-title" style={{fontSize: '1.5rem', marginBottom: '1rem', color: '#333'}}>LaTeX Support</h3>
                <p className="feature-description" style={{color: '#666', lineHeight: '1.6'}}>Beautiful mathematical notation with full LaTeX rendering. Wrap math in <code>$ $</code> for inline or <code>$$ $$</code> for blocks.</p>
              </a>
            </div>
          </div>

          {/* Onboarding Checklist */}
          <div className="section" id="onboardingSection" style={{marginTop: '2rem', marginBottom: '3rem'}}>
            <h2 className="section-title" style={{textAlign: 'center', fontSize: '2rem', marginBottom: '2rem', color: '#333'}}>🚀 Get Started with Three-Sided</h2>
            <p style={{textAlign: 'center', fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem', color: '#666'}}>
              Complete these steps to join our community and start sharing flashcards!
            </p>
            
            <div className="onboarding-checklist" style={{maxWidth: '600px', margin: '0 auto'}}>
              <div 
                className="checklist-item" 
                onClick={() => handleChecklistClick('login')}
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  marginBottom: '1rem', 
                  background: '#fff', 
                  borderRadius: '12px', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  opacity: user ? 0.5 : 1
                }}
              >
                <div className="checklist-icon" style={{
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  border: `2px solid ${user ? '#e2e8f0' : '#007bff'}`, 
                  marginRight: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '14px', 
                  color: user ? '#e2e8f0' : '#007bff'
                }}>1</div>
                <div className="checklist-content" style={{flex: 1}}>
                  <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#333'}}>
                    {user ? '✅ Signed in' : 'Sign in to your account'}
                  </h3>
                  <p style={{margin: 0, color: '#718096', fontSize: '0.9rem'}}>
                    {user ? `Welcome, ${user.displayName || user.email}!` : 'Log in to start creating and sharing flashcards'}
                  </p>
                </div>
                <div className="checklist-arrow" style={{color: '#a0aec0', fontSize: '1.2rem'}}>→</div>
              </div>

              <div 
                className="checklist-item" 
                onClick={() => handleChecklistClick('profile')}
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  marginBottom: '1rem', 
                  background: '#fff', 
                  borderRadius: '12px', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                  cursor: user ? 'pointer' : 'default', 
                  transition: 'all 0.2s',
                  opacity: onboardingStatus.hasProfile ? 0.5 : (user ? 1 : 0.5)
                }}
              >
                <div className="checklist-icon" style={{
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  border: `2px solid ${onboardingStatus.hasProfile ? '#e2e8f0' : (user ? '#007bff' : '#e2e8f0')}`, 
                  marginRight: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '14px', 
                  color: onboardingStatus.hasProfile ? '#e2e8f0' : (user ? '#007bff' : '#e2e8f0')
                }}>2</div>
                <div className="checklist-content" style={{flex: 1}}>
                  <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#333'}}>
                    {onboardingStatus.hasProfile ? '✅ Profile created' : 'Create your public profile'}
                  </h3>
                  <p style={{margin: 0, color: '#718096', fontSize: '0.9rem'}}>
                    {onboardingStatus.hasProfile ? 'Your profile is ready!' : 'Set up your profile to share with the community'}
                  </p>
                </div>
                <div className="checklist-arrow" style={{color: '#a0aec0', fontSize: '1.2rem'}}>→</div>
              </div>

              <div 
                className="checklist-item" 
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  marginBottom: '1rem', 
                  background: '#fff', 
                  borderRadius: '12px', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                  cursor: 'default', 
                  transition: 'all 0.2s',
                  opacity: onboardingStatus.hasCards ? 0.5 : (onboardingStatus.hasProfile ? 1 : 0.5)
                }}
              >
                <div className="checklist-icon" style={{
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  border: `2px solid ${onboardingStatus.hasCards ? '#e2e8f0' : (onboardingStatus.hasProfile ? '#007bff' : '#e2e8f0')}`, 
                  marginRight: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '14px', 
                  color: onboardingStatus.hasCards ? '#e2e8f0' : (onboardingStatus.hasProfile ? '#007bff' : '#e2e8f0')
                }}>3</div>
                <div className="checklist-content" style={{flex: 1}}>
                  <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#333'}}>
                    {onboardingStatus.hasCards ? '✅ First card published' : 'Publish your first card'}
                  </h3>
                  <p style={{margin: 0, color: '#718096', fontSize: '0.9rem'}}>
                    {onboardingStatus.hasCards ? 'You\'re sharing knowledge!' : 'Create and share a flashcard with the community'}
                  </p>
                </div>
                <div className="checklist-arrow" style={{color: '#a0aec0', fontSize: '1.2rem'}}>→</div>
              </div>
            </div>
          </div>

          {/* Search Widget */}
          <div className="section" style={{marginTop: '2rem', marginBottom: '3rem'}}>
            <div className="search-widget" style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #004a99 100%)', 
              borderRadius: '16px', 
              padding: '2rem', 
              textAlign: 'center', 
              color: 'white', 
              boxShadow: '0 10px 30px rgba(0, 102, 204, 0.4)'
            }}>
              <div className="search-icon" style={{fontSize: '3rem', marginBottom: '1rem'}}>🔍</div>
              <h2 style={{fontSize: '1.8rem', marginBottom: '0.5rem', color: 'white'}}>
                Looking for a specific flashcard?
              </h2>
              <p style={{fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.95, color: 'white'}}>
                Search our community flashcard database for exactly what you need. 
                Find cards from thousands of STEM students worldwide.
              </p>
              <a 
                href="/search.html" 
                className="btn btn-secondary" 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)', 
                  color: 'white', 
                  border: '2px solid rgba(255, 255, 255, 0.3)', 
                  backdropFilter: 'blur(10px)', 
                  fontWeight: 600, 
                  padding: '0.75rem 2rem', 
                  fontSize: '1.1rem', 
                  borderRadius: '50px', 
                  textDecoration: 'none', 
                  display: 'inline-block', 
                  transition: 'all 0.3s ease'
                }}
              >
                🔍 Search Community Flashcards
              </a>
            </div>
          </div>

          {/* Authentication Section */}
          {user ? (
            <div className="auth-section" style={{
              background: '#f8f9fa',
              padding: '2rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <h3 style={{color: '#333', marginBottom: '1rem'}}>🔐 Welcome, {user.displayName || user.email}!</h3>
              <p style={{color: '#666', marginBottom: '1rem'}}>You're signed in and ready to create flashcards!</p>
              <button 
                onClick={handleSignOut}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-section" style={{
              background: '#f8f9fa',
              padding: '2rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <h3 style={{color: '#333', marginBottom: '1rem'}}>🔐 Sign in to get started</h3>
              <p style={{color: '#666', marginBottom: '1rem'}}>Join the Three-Sided community and start creating flashcards!</p>
              <button 
                onClick={handleSignIn}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1.1rem'
                }}
              >
                Sign in with Google
              </button>
            </div>
          )}

          {/* React Demo Section */}
          <div className="section" style={{marginTop: '2rem', textAlign: 'center'}}>
            <h2 className="section-title" style={{fontSize: '2rem', marginBottom: '1rem', color: '#333'}}>🚀 React Version - Full Featured!</h2>
            <p style={{fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem', color: '#666'}}>
              This React version now has working authentication, flashcard creation, and study mode!
            </p>
            
            <div style={{background: '#f8f9fa', padding: '2rem', borderRadius: '12px', maxWidth: '400px', margin: '0 auto'}}>
              <p>React Counter Demo:</p>
              <button 
                onClick={() => setCount(count + 1)}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1.1rem'
                }}
              >
                Count: {count}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="App" style={{fontFamily: 'Arial, sans-serif', lineHeight: '1.6'}}>
      {/* Navigation */}
      {currentMode !== 'home' && (
        <div style={{
          background: 'white',
          padding: '1rem 2rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setCurrentMode('home')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: '#007bff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Back to Home
          </button>
          <h1 style={{margin: 0, color: '#333'}}>
            {currentMode === 'create' ? '✏️ Create Flashcard' : '📚 Study Mode'}
          </h1>
          <div style={{width: '100px'}}></div> {/* Spacer for centering */}
        </div>
      )}

      {/* Main Content */}
      {renderContent()}
    </div>
  )
}

export default App
