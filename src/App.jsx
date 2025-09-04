import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { UserService } from './services/userService'
import FlashcardCreator from './components/FlashcardCreator'
import StudyMode from './components/StudyMode'
import SearchAndDiscovery from './components/SearchAndDiscovery'
import LeaderboardAndStats from './components/LeaderboardAndStats'
import UserDashboard from './components/UserDashboard'
import TagSystem from './components/TagSystem'
import SpacedRepetition from './components/SpacedRepetition'
import LaTeXConverter from './components/LaTeXConverter'
import PremiumFeatures from './components/PremiumFeatures'
import './index.css'

function App() {
  const [currentMode, setCurrentMode] = useState('home')
  const [onboardingStatus, setOnboardingStatus] = useState({
    hasProfile: false,
    hasCards: false
  })
  const [showTagSystem, setShowTagSystem] = useState(false)
  const [showSpacedRepetition, setShowSpacedRepetition] = useState(false)
  const [showLaTeXConverter, setShowLaTeXConverter] = useState(false)
  const [showPremiumFeatures, setShowPremiumFeatures] = useState(false)
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
    try { await signInWithGoogle(); } catch (error) { console.error('Error signing in:', error); }
  };
  const handleSignOut = async () => {
    try { await logout(); } catch (error) { console.error('Error signing out:', error); }
  };

  const handleChecklistClick = async (step) => {
    if (!user) { await handleSignIn(); return; }
    if (step === 'profile' && !onboardingStatus.hasProfile) {
      try {
        await UserService.createUserProfile(user.uid, { email: user.email, displayName: user.displayName, photoURL: user.photoURL });
        await checkOnboardingStatus();
      } catch (error) { console.error('Error creating profile:', error); }
    }
  };

  const handleCardCreated = async () => { await checkOnboardingStatus(); setCurrentMode('home'); };

  const renderContent = () => {
    switch (currentMode) {
      case 'create': return <FlashcardCreator onCardCreated={handleCardCreated} onClose={() => setCurrentMode('home')} />
      case 'study': return <StudyMode />
      case 'search': return <SearchAndDiscovery />
      case 'leaderboard': return <LeaderboardAndStats />
      case 'dashboard': return <UserDashboard />
      default: return renderHomeContent()
    }
  };

  const NavBar = () => (
    <div className="navbar">
      <div className="container py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/files/three-sided_logo.png" alt="Three-Sided" width="36" height="36" style={{borderRadius:'8px'}} />
          <span className="text-gradient text-xl font-bold">Three‑Sided</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button className="btn btn-secondary" onClick={() => setCurrentMode('search')}>Search</button>
          <button className="btn btn-secondary" onClick={() => setCurrentMode('leaderboard')}>Leaderboard</button>
          <button className="btn btn-secondary" onClick={() => setCurrentMode('dashboard')}>Dashboard</button>
          {user ? (
            <button className="btn btn-primary" onClick={handleSignOut}>Sign out</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSignIn}>Sign in</button>
          )}
        </div>
      </div>
    </div>
  )

  const renderHomeContent = () => (
    <>
      {/* Hero Section */}
      <section className="hero-mesh">
        <div className="hero-overlay"></div>
        <div className="container py-24 text-center">
          <div className="badge mb-4 reveal-up">React Preview</div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gradient reveal-up reveal-delay-1">Master Any Subject with Three‑Sided</h1>
          <p className="subtle max-w-2xl mx-auto mt-5 text-lg reveal-up reveal-delay-2">Create, study, and share flashcards with AI assistance. Learn faster with spaced repetition and a community library.</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center reveal-up reveal-delay-3">
            <button onClick={() => setCurrentMode('search')} className="btn btn-primary">🔍 Search Flashcards</button>
            <button onClick={() => setCurrentMode('leaderboard')} className="btn btn-secondary">🏆 View Leaderboard</button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container section">
        {/* Quick Actions */}
        {user && (
          <div className="card hover-lift p-8 mb-12 gradient-border">
            <div className="p-1 rounded-2xl">
              <h2 className="text-3xl font-bold text-gradient mb-6">🚀 Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => setCurrentMode('create')} className="btn btn-success h-auto py-5 flex-col gap-2">✏️ Create Flashcard</button>
                <button onClick={() => setCurrentMode('study')} className="btn btn-primary h-auto py-5 flex-col gap-2">📚 Study Mode</button>
                <button onClick={() => setCurrentMode('search')} className="btn btn-accent h-auto py-5 flex-col gap-2">🔍 Search & Discover</button>
                <button onClick={() => setCurrentMode('dashboard')} className="btn btn-warning h-auto py-5 flex-col gap-2">🎯 My Dashboard</button>
              </div>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-6 mb-12 lg:grid-cols-3">
          <div className="card hover-lift p-8 text-center reveal-up">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-2xl font-bold mb-3">Community‑Driven</h3>
            <p className="subtle">Discover and share flashcards with students worldwide. Learn from the community's collective knowledge.</p>
          </div>
          <div className="card hover-lift p-8 text-center reveal-up reveal-delay-1">
            <div className="text-6xl mb-4">🧠</div>
            <h3 className="text-2xl font-bold mb-3">AI‑Powered Assistance</h3>
            <p className="subtle">Get AI‑generated hints and proofs to help you create better flashcards faster.</p>
          </div>
          <div className="card hover-lift p-8 text-center reveal-up reveal-delay-2">
            <div className="text-6xl mb-4">📐</div>
            <h3 className="text-2xl font-bold mb-3">LaTeX Support</h3>
            <p className="subtle">Beautiful mathematical notation with full LaTeX rendering. Use $...$ for inline and $$...$$ for blocks.</p>
          </div>
        </div>

        {/* Onboarding - Modern Stepper */}
        <div className="card hover-lift p-8 mb-12 reveal-up">
          <h2 className="text-3xl font-bold text-gradient mb-2">🚀 Get Started</h2>
          <p className="subtle mb-6">Complete these quick steps to start sharing flashcards.</p>
          <div className="stepper">
            <div className={`step ${user ? 'ok' : ''}`} onClick={() => handleChecklistClick('login')}>
              <div className="step-icon">1</div>
              <div className="step-body">
                <div className="step-title">{user ? 'Signed in' : 'Sign in to your account'}</div>
                <div className="step-sub">{user ? `Welcome, ${user.displayName || user.email}!` : 'Use Google sign-in to get started.'}</div>
              </div>
            </div>
            <div className={`step ${onboardingStatus.hasProfile ? 'ok' : ''}`} onClick={user && !onboardingStatus.hasProfile ? () => handleChecklistClick('profile') : undefined}>
              <div className="step-icon">2</div>
              <div className="step-body">
                <div className="step-title">{onboardingStatus.hasProfile ? 'Profile created' : 'Create your public profile'}</div>
                <div className="step-sub">{onboardingStatus.hasProfile ? 'Your profile is ready.' : 'Set a display name and avatar.'}</div>
              </div>
            </div>
            <div className={`step ${onboardingStatus.hasCards ? 'ok' : ''}`}>
              <div className="step-icon">3</div>
              <div className="step-body">
                <div className="step-title">{onboardingStatus.hasCards ? 'First card published' : 'Publish your first card'}</div>
                <div className="step-sub">{onboardingStatus.hasCards ? 'Nice work!' : 'Create a flashcard and share it publicly.'}</div>
              </div>
            </div>
          </div>
          {!onboardingStatus.hasCards && (
            <div className="text-center mt-4">
              <button onClick={() => setCurrentMode('create')} className="btn btn-primary">✏️ Create your first card</button>
            </div>
          )}
        </div>

        {/* Search CTA */}
        <div className="card hover-lift p-12 mb-12 text-center reveal-up" style={{background:'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(124,58,237,0.18))'}}>
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-3xl font-bold mb-3">Looking for a specific flashcard?</h2>
          <p className="subtle mb-6">Search our community flashcard database for exactly what you need. Find cards from thousands of STEM students worldwide.</p>
          <button onClick={() => setCurrentMode('search')} className="btn btn-secondary">🔎 Search Community Flashcards</button>
        </div>

        {/* Minimal Footer */}
        <footer className="reveal-up" style={{marginTop:'2rem'}}>
          <div className="container" style={{padding:'2rem 0', borderTop:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="subtle" style={{display:'flex', flexWrap:'wrap', gap:'1rem', justifyContent:'space-between', alignItems:'center'}}>
              <div>© {new Date().getFullYear()} Three‑Sided</div>
              <div style={{display:'flex', gap:'1rem'}}>
                <a className="subtle" href="mailto:amirbattye@gmail.com">Contact</a>
                <a className="subtle" href="/latex_guide.html" target="_blank" rel="noreferrer">LaTeX Guide</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {currentMode === 'home' ? <NavBar /> : (
        <div className="navbar">
          <div className="container py-3 flex items-center justify-between">
            <button onClick={() => setCurrentMode('home')} className="btn btn-secondary">← Back to Home</button>
            <h1 className="text-gradient text-xl font-bold">
              {currentMode === 'create' && '✏️ Create Flashcard'}
              {currentMode === 'study' && '📚 Study Mode'}
              {currentMode === 'search' && '🔍 Search & Discovery'}
              {currentMode === 'leaderboard' && '🏆 Leaderboard & Stats'}
              {currentMode === 'dashboard' && '🎯 My Dashboard'}
            </h1>
            <div style={{width:'90px'}}></div>
          </div>
        </div>
      )}
      {renderContent()}
      {/* Modals */}
      <TagSystem isVisible={showTagSystem} onClose={() => setShowTagSystem(false)} selectedTags={[]} onTagsChange={() => {}} />
      <SpacedRepetition isVisible={showSpacedRepetition} onClose={() => setShowSpacedRepetition(false)} />
      <LaTeXConverter isVisible={showLaTeXConverter} onClose={() => setShowLaTeXConverter(false)} />
      <PremiumFeatures isVisible={showPremiumFeatures} onClose={() => setShowPremiumFeatures(false)} />
    </div>
  )
}

export default App

