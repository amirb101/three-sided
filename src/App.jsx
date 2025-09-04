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
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setCurrentMode('home')}>
          <div className="relative">
            <img 
              src="/files/three-sided_logo.png" 
              alt="Three-Sided" 
              width="40" 
              height="40" 
              className="rounded-xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-105" 
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </div>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent group-hover:from-white group-hover:to-white transition-all duration-300">Three‑Sided</span>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-200" onClick={() => setCurrentMode('search')}>
            🔍 Search
          </button>
          <button className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-200" onClick={() => setCurrentMode('leaderboard')}>
            🏆 Leaderboard
          </button>
          <button className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-200" onClick={() => setCurrentMode('dashboard')}>
            🎯 Dashboard
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 text-green-300 rounded-xl border border-green-700/50">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{user.displayName?.split(' ')[0] || 'User'}</span>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-200" onClick={handleSignIn}>
              ✨ Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderHomeContent = () => (
    <div className="bg-slate-900 min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          
          {/* Floating orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center py-24">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 text-green-300 rounded-full border border-green-700/50 mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold">✨ New React Version - Live Now</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8">
            <span className="bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
              Master Any Subject
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              with Three‑Sided
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto mb-12 leading-relaxed">
            Create, study, and share flashcards with <span className="text-purple-400 font-semibold">AI assistance</span>. 
            Learn faster with <span className="text-blue-400 font-semibold">spaced repetition</span> and a 
            <span className="text-indigo-400 font-semibold"> community library</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => setCurrentMode('search')} 
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-2xl shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 min-w-[200px]"
            >
              <span className="relative z-10 flex items-center gap-3">
                🔍 <span>Search Flashcards</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            <button 
              onClick={() => setCurrentMode('leaderboard')} 
              className="group px-8 py-4 bg-slate-800/50 hover:bg-slate-700 text-white font-semibold rounded-2xl border-2 border-slate-600 hover:border-slate-500 backdrop-blur-sm transform hover:scale-105 transition-all duration-300 min-w-[200px]"
            >
              <span className="flex items-center gap-3">
                🏆 <span>View Leaderboard</span>
              </span>
            </button>
          </div>

          {/* Stats Preview */}
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">10K+</div>
              <div className="text-slate-400">Flashcards</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-slate-400">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">50+</div>
              <div className="text-slate-400">Subjects</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-slate-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Quick Actions */}
        {user && (
          <div className="relative p-8 mb-16 rounded-3xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm shadow-2xl">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
            <div className="relative z-10">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-extrabold mb-3">
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">🚀 Quick Actions</span>
                </h2>
                <p className="text-slate-300 text-lg">Jump into your learning journey</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <button 
                  onClick={() => setCurrentMode('create')} 
                  className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-3">✏️</div>
                    <div className="font-bold text-lg mb-1">Create</div>
                    <div className="text-white/80 text-sm">New Flashcard</div>
                  </div>
                </button>

                <button 
                  onClick={() => setCurrentMode('study')} 
                  className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-3">📚</div>
                    <div className="font-bold text-lg mb-1">Study</div>
                    <div className="text-white/80 text-sm">Practice Mode</div>
                  </div>
                </button>

                <button 
                  onClick={() => setCurrentMode('search')} 
                  className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <div className="font-bold text-lg mb-1">Search</div>
                    <div className="text-white/80 text-sm">& Discover</div>
                  </div>
                </button>

                <button 
                  onClick={() => setCurrentMode('dashboard')} 
                  className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-3">🎯</div>
                    <div className="font-bold text-lg mb-1">Dashboard</div>
                    <div className="text-white/80 text-sm">My Progress</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-8 mb-16 lg:grid-cols-3">
          <div className="group relative overflow-hidden bg-slate-800/30 p-8 rounded-3xl border border-slate-700 hover:border-blue-500/40 transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 text-4xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                👥
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Community‑Driven</h3>
              <p className="text-slate-300 leading-relaxed">Discover and share flashcards with students worldwide. Learn from the community's collective knowledge and contribute your own.</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-slate-800/30 p-8 rounded-3xl border border-slate-700 hover:border-purple-500/40 transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-6 text-4xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                🧠
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">AI‑Powered Assistance</h3>
              <p className="text-slate-300 leading-relaxed">Get AI‑generated hints, proofs, and suggestions to help you create better flashcards faster and study more effectively.</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-slate-800/30 p-8 rounded-3xl border border-slate-700 hover:border-indigo-500/40 transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mb-6 text-4xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                📐
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">LaTeX Support</h3>
              <p className="text-slate-300 leading-relaxed">Beautiful mathematical notation with full LaTeX rendering. Use $...$ for inline math and $$...$$ for display blocks.</p>
            </div>
          </div>
        </div>

        {/* Onboarding - Modern Stepper */}
        <div className="relative p-8 mb-16 rounded-3xl bg-slate-800/30 border border-slate-700 backdrop-blur-sm shadow-2xl">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-success-500/5 to-accent-500/5"></div>
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-extrabold mb-3">
                <span className="bg-gradient-to-r from-success-400 to-primary-400 bg-clip-text text-transparent">🚀 Get Started</span>
              </h2>
              <p className="text-white/70 text-lg">Complete these quick steps to join our community</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div 
                className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  user 
                    ? 'bg-gradient-to-br from-success-500/20 to-success-600/30 border-success-400/40 shadow-lg' 
                    : 'bg-white/5 border-white/20 hover:border-white/40 hover:bg-white/10'
                }`}
                onClick={() => handleChecklistClick('login')}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    user ? 'bg-success-500 text-white' : 'bg-primary-500 text-white'
                  }`}>
                    {user ? '✓' : '1'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-white mb-1">
                      {user ? 'Signed In' : 'Sign In'}
                    </div>
                    <div className="text-white/70 text-sm">
                      {user ? `Welcome, ${user.displayName?.split(' ')[0] || 'User'}!` : 'Use Google to get started'}
                    </div>
                  </div>
                </div>
              </div>

              <div 
                className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 ${
                  onboardingStatus.hasProfile 
                    ? 'bg-gradient-to-br from-success-500/20 to-success-600/30 border-success-400/40 shadow-lg' 
                    : user
                      ? 'bg-white/5 border-white/20 hover:border-white/40 hover:bg-white/10 cursor-pointer'
                      : 'bg-white/5 border-white/10 opacity-50'
                }`}
                onClick={user && !onboardingStatus.hasProfile ? () => handleChecklistClick('profile') : undefined}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    onboardingStatus.hasProfile ? 'bg-success-500 text-white' : 'bg-primary-500 text-white'
                  }`}>
                    {onboardingStatus.hasProfile ? '✓' : '2'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-white mb-1">
                      {onboardingStatus.hasProfile ? 'Profile Created' : 'Create Profile'}
                    </div>
                    <div className="text-white/70 text-sm">
                      {onboardingStatus.hasProfile ? 'Profile is ready!' : 'Set display name & avatar'}
                    </div>
                  </div>
                </div>
              </div>

              <div 
                className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 ${
                  onboardingStatus.hasCards 
                    ? 'bg-gradient-to-br from-success-500/20 to-success-600/30 border-success-400/40 shadow-lg' 
                    : user
                      ? 'bg-white/5 border-white/20'
                      : 'bg-white/5 border-white/10 opacity-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    onboardingStatus.hasCards ? 'bg-success-500 text-white' : 'bg-primary-500 text-white'
                  }`}>
                    {onboardingStatus.hasCards ? '✓' : '3'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-white mb-1">
                      {onboardingStatus.hasCards ? 'First Card Published' : 'Publish First Card'}
                    </div>
                    <div className="text-white/70 text-sm">
                      {onboardingStatus.hasCards ? 'Nice work!' : 'Share with the community'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {user && !onboardingStatus.hasCards && (
              <div className="text-center mt-8">
                <button 
                  onClick={() => setCurrentMode('create')} 
                  className="bg-gradient-to-r from-success-500 to-primary-500 hover:from-success-600 hover:to-primary-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  ✏️ Create Your First Card
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search CTA */}
        <div className="relative overflow-hidden p-16 mb-16 rounded-3xl bg-gradient-to-br from-accent-500/20 via-primary-500/20 to-secondary-500/20 border border-white/20 text-center group hover:scale-105 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-500/10 to-primary-500/10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-accent-400 to-primary-500 rounded-3xl mb-8 text-5xl shadow-2xl group-hover:shadow-glow/80 transition-all duration-300">
              🔍
            </div>
            
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-accent-300 to-primary-300 bg-clip-text text-transparent">
                Looking for something specific?
              </span>
            </h2>
            
            <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8 leading-relaxed">
              Search our community database of <span className="text-accent-300 font-semibold">10,000+ flashcards</span> from 
              <span className="text-primary-300 font-semibold"> students worldwide</span>. Find exactly what you need to ace your studies.
            </p>
            
            <button 
              onClick={() => setCurrentMode('search')} 
              className="group/btn relative overflow-hidden bg-gradient-to-r from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white px-12 py-6 rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-glow/80 transform hover:scale-105 transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-3">
                🔎 <span>Search Community Flashcards</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>

        {/* Enhanced Footer */}
        <footer className="relative overflow-hidden mt-24 py-16 bg-gradient-to-t from-primary-900/20 to-transparent border-t border-white/10">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <img 
                  src="/files/three-sided_logo.png" 
                  alt="Three-Sided" 
                  width="48" 
                  height="48" 
                  className="rounded-xl shadow-lg" 
                />
                <span className="text-3xl font-extrabold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  Three‑Sided
                </span>
              </div>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">
                Empowering students worldwide with AI-enhanced flashcards and collaborative learning.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-white/10">
              <div className="text-white/60">
                © {new Date().getFullYear()} Three‑Sided. Made with ❤️ for students.
              </div>
              
              <div className="flex items-center gap-8">
                <a 
                  href="mailto:amirbattye@gmail.com" 
                  className="text-white/60 hover:text-accent-300 transition-colors duration-200 font-medium"
                >
                  Contact
                </a>
                <a 
                  href="/latex_guide.html" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-white/60 hover:text-primary-300 transition-colors duration-200 font-medium"
                >
                  LaTeX Guide
                </a>
                <div className="flex items-center gap-2 px-3 py-1 bg-success-50 text-success-800 rounded-full text-sm">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Beta</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
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

