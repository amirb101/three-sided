import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { UserService } from './services/userService'
import { ProfileService } from './services/profileService'
import FlashcardCreator from './components/FlashcardCreator'
import StudyMode from './components/StudyMode'
import SearchAndDiscovery from './components/SearchAndDiscovery'
import LeaderboardAndStats from './components/LeaderboardAndStats'
import UserDashboard from './components/UserDashboard'
import TagSystem from './components/TagSystem'
import SpacedRepetition from './components/SpacedRepetition'
import LaTeXConverter from './components/LaTeXConverter'
import PremiumFeatures from './components/PremiumFeatures'
import ProfileCreator from './components/ProfileCreator'
import SocialHub from './components/SocialHub'
import PublicProfile from './components/PublicProfile'
import DeckCreator from './components/DeckCreator'
import DeckManager from './components/DeckManager'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import AdminAnalyticsDashboard from './components/AdminAnalyticsDashboard'
import IconTestPage from './components/IconTestPage'
import CacheDebugger from './components/CacheDebugger'
import { 
  DashboardIcon, 
  UserIcon, 
  SearchIcon, 
  CardsIcon, 
  EditIcon, 
  TrophyIcon, 
  ViewIcon, 
  SuccessIcon, 
  AIBotIcon, 
  MathIcon, 
  TargetIcon, 
  BookIcon, 
  LearningAnalyticsIcon,
  HeartIcon,
  FastIcon,
  DesktopIcon,
  SocialIcon
} from './components/icons'
import AdminDashboard from './components/AdminDashboard'
import { WebsiteAnalyticsService } from './services/websiteAnalyticsService'
import { AdminService } from './services/adminService.js'
import './index.css'

function App() {
  const [currentMode, setCurrentMode] = useState('home')
  const [viewingProfileSlug, setViewingProfileSlug] = useState(null)
  const [editingDeck, setEditingDeck] = useState(null)
  const [selectedDeck, setSelectedDeck] = useState(null)
  const [onboardingStatus, setOnboardingStatus] = useState({
    hasProfile: false,
    hasCards: false
  })
  const [showTagSystem, setShowTagSystem] = useState(false)
  const [showSpacedRepetition, setShowSpacedRepetition] = useState(false)
  const [showLaTeXConverter, setShowLaTeXConverter] = useState(false)
  const [showPremiumFeatures, setShowPremiumFeatures] = useState(false)
  const [cardRefreshKey, setCardRefreshKey] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const { user, signInWithGoogle, logout, authError, getFreshIdToken, sessionWarning, dismissSessionWarning } = useAuth()

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  // Initialize website analytics tracking
  useEffect(() => {
    // Initialize automatic tracking when app loads
    WebsiteAnalyticsService.initializeAutoTracking(user?.uid);
    
    // Track initial app load
    WebsiteAnalyticsService.trackFeatureUsage('app', 'loaded', {
      userLoggedIn: !!user
    }, user?.uid);
  }, []);

  // Track page/mode changes and manage browser history
  useEffect(() => {
    if (currentMode) {
      WebsiteAnalyticsService.trackPageView(`/new/${currentMode}`, null, user?.uid);
      WebsiteAnalyticsService.trackUserFlow(
        localStorage.getItem('lastMode') || 'home',
        currentMode,
        'navigation',
        user?.uid
      );
      localStorage.setItem('lastMode', currentMode);
      
      // Update browser history for proper back button behavior
      const url = new URL(window.location);
      url.searchParams.set('mode', currentMode);
      window.history.replaceState({ mode: currentMode }, '', url.toString());
    }
  }, [currentMode]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event) => {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode') || event.state?.mode || 'home';
      setCurrentMode(mode);
    };

    window.addEventListener('popstate', handlePopState);
    
    // Set initial state if there's a mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialMode = urlParams.get('mode');
    if (initialMode) {
      setCurrentMode(initialMode);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Track user authentication and check admin status
  useEffect(() => {
    if (user) {
      WebsiteAnalyticsService.trackConversion('user_login', 1, user.uid);
      WebsiteAnalyticsService.trackFeatureUsage('auth', 'login_success', {}, user.uid);
      
      // Check admin status
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const adminAccess = await AdminService.verifyAdminAccess(user);
      setIsAdmin(adminAccess);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const status = await UserService.checkOnboardingStatus(user.uid);
      
      // Also check if user has a profile in the new system
      const hasProfile = await ProfileService.hasProfile(user.uid);
      
      // Auto-migrate user to deck system if needed
      try {
        const migrationResult = await UserService.autoMigrateUserDecks(user.uid);
        if (migrationResult.success && migrationResult.migrationResult) {
          console.log('✅ Deck migration completed:', migrationResult.message);
        }
      } catch (migrationError) {
        console.warn('Deck migration failed:', migrationError);
        // Don't break the app if migration fails
      }
      
      setOnboardingStatus({
        ...status,
        hasProfile: status.hasProfile || hasProfile
      });
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

  const handleProfileNavigation = async () => {
    if (!user) {
      await handleSignIn();
      return;
    }

    try {
      // Check if user has a profile
      const profile = await UserService.getUserProfile(user.uid);
      
      if (profile) {
        // User has a profile, go to dashboard which shows profile info
        setCurrentMode('dashboard');
      } else {
        // User needs to create a profile
        setCurrentMode('create-profile');
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      // Default to create profile if unsure
      setCurrentMode('create-profile');
    }
  };

  const handleChecklistClick = async (step) => {
    if (!user) { await handleSignIn(); return; }
    if (step === 'profile' && !onboardingStatus.hasProfile) {
      // Use React ProfileCreator instead of redirecting to old HTML
      setCurrentMode('create-profile');
    }
  };

  const handleCardCreated = async () => { await checkOnboardingStatus(); setCurrentMode('home'); };

  const handleProfileCreated = async () => {
    await checkOnboardingStatus();
    setCurrentMode('home');
  };

  const handleViewProfile = (slug) => {
    setViewingProfileSlug(slug);
    setCurrentMode('profile');
  };

  const onCardCreated = () => {
    // Force StudyMode to refresh when a new card is created
    setCardRefreshKey(prev => prev + 1);
    // Also refresh onboarding status
    if (user) {
      checkOnboardingStatus();
    }
  };

  const renderContent = () => {
    switch (currentMode) {
      case 'create': return <FlashcardCreator onCardCreated={onCardCreated} onClose={() => setCurrentMode('home')} />
      case 'study': return <StudyMode key={cardRefreshKey} />
      case 'search': return <SearchAndDiscovery />
      case 'decks': return (
        <DeckManager 
          onCreateDeck={() => setCurrentMode('create-deck')}
          onEditDeck={(deck) => {
            setEditingDeck(deck);
            setCurrentMode('edit-deck');
          }}
          onSelectDeck={(deck) => {
            setSelectedDeck(deck);
            // Could navigate to study mode with this deck, or show deck details
            setCurrentMode('study');
          }}
        />
      )
      case 'create-deck': return (
        <DeckCreator 
          onDeckCreated={() => setCurrentMode('decks')}
          onClose={() => setCurrentMode('decks')}
        />
      )
      case 'edit-deck': return (
        <DeckCreator 
          editingDeck={editingDeck}
          onDeckCreated={() => {
            setEditingDeck(null);
            setCurrentMode('decks');
          }}
          onClose={() => {
            setEditingDeck(null);
            setCurrentMode('decks');
          }}
        />
      )
      case 'analytics': return (
        <AnalyticsDashboard 
          onClose={() => setCurrentMode('home')}
        />
      )
      case 'admin-analytics': return (
        <AdminAnalyticsDashboard 
          onClose={() => setCurrentMode('home')}
        />
      )
      case 'admin-dashboard': return (
        <AdminDashboard 
          onClose={() => setCurrentMode('home')}
        />
      )
      case 'leaderboard': return <LeaderboardAndStats />
      case 'dashboard': return <UserDashboard />
      case 'icon-test': return <IconTestPage />
      case 'create-profile': return <ProfileCreator onProfileCreated={handleProfileCreated} onClose={() => setCurrentMode('home')} />
      case 'social': return <SocialHub onViewProfile={handleViewProfile} />
      case 'profile': return <PublicProfile profileSlug={viewingProfileSlug} onClose={() => setCurrentMode('home')} />
      default: return renderHomeContent()
    }
  };

  const NavBar = () => {
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showStudyDropdown, setShowStudyDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showAdminDropdown, setShowAdminDropdown] = useState(false);

    return (
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{
        backgroundColor: 'rgba(246, 245, 236, 0.8)',
        borderBottomColor: 'var(--border-light)'
      }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
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
            <span className="text-xl md:text-2xl font-extrabold tracking-tight" style={{color: 'var(--claude-heading)'}}>Three‑Sided</span>
          </div>

          {/* Desktop Navigation - Only show if signed in */}
          {currentMode === 'home' && user && (
            <div className="hidden lg:flex items-center gap-3">
              <button className="claude-button-secondary flex items-center gap-2" onClick={() => setCurrentMode('search')}>
                <SearchIcon size={16} color="default" />
                Search
              </button>
              
              {/* Study & Content Dropdown */}
              <div className="relative">
                <button 
                  className="claude-button-secondary flex items-center gap-1"
                  onClick={() => setShowStudyDropdown(!showStudyDropdown)}
                  onBlur={() => setTimeout(() => setShowStudyDropdown(false), 200)}
                >
                  <CardsIcon size={16} color="default" />
                  Study ▾
                </button>
                {showStudyDropdown && (
                  <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48 z-60">
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setCurrentMode('decks');
                        setShowStudyDropdown(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <CardsIcon size={16} color="default" />
                        My Decks
                      </div>
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setCurrentMode('study');
                        setShowStudyDropdown(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <TargetIcon size={16} color="default" />
                        Study Mode
                      </div>
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setCurrentMode('create');
                        setShowStudyDropdown(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <EditIcon size={16} color="default" />
                        Create Flashcard
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button className="claude-button-secondary flex items-center gap-2" onClick={() => setCurrentMode('social')}>
                <SocialIcon size={16} color="default" />
                Social
              </button>
              <button className="claude-button-secondary flex items-center gap-2" onClick={() => setCurrentMode('leaderboard')}>
                <TrophyIcon size={16} color="default" />
                Leaderboard
              </button>

              {/* User Account Dropdown */}
              <div className="relative">
                <button 
                  className="claude-button-secondary flex items-center gap-1"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                >
                  <UserIcon size={16} color="default" />
                  Account ▾
                </button>
                {showUserDropdown && (
                  <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48 z-60">
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setCurrentMode('dashboard');
                        setShowUserDropdown(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <DashboardIcon size={16} color="default" />
                        My Dashboard
                      </div>
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      onClick={() => {
                        handleProfileNavigation();
                        setShowUserDropdown(false);
                      }}
                    >
                      <UserIcon size={16} color="default" />
                      My Profile
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setCurrentMode('analytics');
                        setShowUserDropdown(false);
                        WebsiteAnalyticsService.trackClick('button', { text: 'Analytics', action: 'view_analytics' }, user?.uid);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <LearningAnalyticsIcon size={16} color="default" />
                        Learning Analytics
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Admin Dropdown - Only for admins */}
              {isAdmin && (
                <div className="relative">
                  <button 
                    className="claude-button-secondary bg-red-50 text-red-700 hover:bg-red-100 border-red-200 flex items-center gap-1"
                    onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                    onBlur={() => setTimeout(() => setShowAdminDropdown(false), 200)}
                  >
                    🔧 Admin ▾
                  </button>
                  {showAdminDropdown && (
                    <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48 z-60">
                      <button 
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          setCurrentMode('admin-analytics');
                          setShowAdminDropdown(false);
                          WebsiteAnalyticsService.trackClick('button', { text: 'Website Analytics', action: 'view_admin_analytics' }, user?.uid);
                        }}
                      >
                        🚀 Website Analytics
                      </button>
                      <button 
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-red-600"
                        onClick={() => {
                          setCurrentMode('admin-dashboard');
                          setShowAdminDropdown(false);
                          WebsiteAnalyticsService.trackClick('button', { text: 'Admin Dashboard', action: 'view_admin_dashboard' }, user?.uid);
                        }}
                      >
                        🔧 Admin Dashboard
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Page Title for non-home modes */}
          {currentMode !== 'home' && (
            <div className="hidden md:block">
              <span className="text-lg font-bold" style={{color: 'var(--claude-heading)'}}>
                {currentMode === 'create' && '✏️ Create Flashcard'}
                {currentMode === 'study' && '📚 Study Mode'}
                {currentMode === 'search' && 'Search & Discovery'}
                {currentMode === 'decks' && '📚 My Decks'}
                {currentMode === 'create-deck' && '➕ Create Deck'}
                {currentMode === 'edit-deck' && '✏️ Edit Deck'}
                {currentMode === 'analytics' && '📊 Learning Analytics'}
                {currentMode === 'admin-analytics' && '🚀 Website Analytics'}
                {currentMode === 'admin-dashboard' && '🔧 Admin Dashboard'}
                {currentMode === 'leaderboard' && '🏆 Leaderboard & Stats'}
                {currentMode === 'dashboard' && '🎯 My Dashboard'}
                {viewingProfileSlug && '👤 Profile'}
                {!viewingProfileSlug && currentMode === 'social' && '👥 Social Hub'}
                {!viewingProfileSlug && currentMode === 'create-profile' && '👤 Create Profile'}
              </span>
            </div>
          )}

          {/* Right side - Always visible */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button - Only show if signed in */}
            {user && (
              <button 
                className="lg:hidden claude-button-secondary"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                ☰
              </button>
            )}

            {/* User info / Sign in */}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl" style={{
                  backgroundColor: 'rgba(91, 200, 162, 0.15)',
                  border: '1px solid var(--success)',
                  color: 'var(--success)'
                }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor: 'var(--success)'}}></div>
                  <span className="text-sm font-medium">{user.displayName?.split(' ')[0] || 'User'}</span>
                </div>
                <button className="claude-button-secondary" style={{
                  borderColor: 'var(--error)',
                  color: 'var(--error)'
                }} onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {authError && (
                  <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 max-w-xs text-right">
                    {authError}
                  </div>
                )}
                <button 
                  className="claude-button-primary transform hover:scale-105 transition-all duration-200" 
                  onClick={handleSignIn}
                  style={{background: 'linear-gradient(135deg, #D4A574 0%, #C19A6B 100%)'}}
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu - Only show if signed in */}
        {user && showMobileMenu && (
          <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-2">
              <button 
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => { setCurrentMode('search'); setShowMobileMenu(false); }}
              >
                <div className="flex items-center gap-3">
                  <SearchIcon size={16} color="default" />
                  Search
                </div>
              </button>
              <button 
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => { setCurrentMode('decks'); setShowMobileMenu(false); }}
              >
                <div className="flex items-center gap-3">
                  <CardsIcon size={16} color="default" />
                  My Decks
                </div>
              </button>
              <button 
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => { setCurrentMode('study'); setShowMobileMenu(false); }}
              >
                <div className="flex items-center gap-3">
                  <TargetIcon size={16} color="default" />
                  Study Mode
                </div>
              </button>
              <button 
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => { setCurrentMode('create'); setShowMobileMenu(false); }}
              >
                <div className="flex items-center gap-3">
                  <EditIcon size={16} color="default" />
                  Create Flashcard
                </div>
              </button>
              <button 
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => { setCurrentMode('social'); setShowMobileMenu(false); }}
              >
                👥 Social
              </button>
              <button 
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => { setCurrentMode('leaderboard'); setShowMobileMenu(false); }}
              >
                <div className="flex items-center gap-3">
                  <TrophyIcon size={16} color="default" />
                  Leaderboard
                </div>
              </button>
              <div className="border-t border-gray-200 my-2"></div>
              <button 
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => { setCurrentMode('dashboard'); setShowMobileMenu(false); }}
              >
                <div className="flex items-center gap-2">
                  <DashboardIcon size={16} color="default" />
                  My Dashboard
                </div>
              </button>
              <button 
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => { handleProfileNavigation(); setShowMobileMenu(false); }}
              >
                <div className="flex items-center gap-3">
                  <UserIcon size={16} color="default" />
                  My Profile
                </div>
              </button>
              <button 
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => { 
                  setCurrentMode('analytics'); 
                  setShowMobileMenu(false);
                  WebsiteAnalyticsService.trackClick('button', { text: 'Analytics', action: 'view_analytics' }, user?.uid);
                }}
              >
                <div className="flex items-center gap-2">
                  <DashboardIcon size={16} color="default" />
                  Learning Analytics
                </div>
              </button>
              {isAdmin && (
                <>
                  <div className="border-t border-red-200 my-2"></div>
                  <div className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-lg mb-2">
                    🔧 ADMIN CONTROLS
                  </div>
                  <button 
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-red-50 transition-colors text-red-600 font-medium"
                    onClick={() => { 
                      setCurrentMode('admin-analytics'); 
                      setShowMobileMenu(false);
                      WebsiteAnalyticsService.trackClick('button', { text: 'Website Analytics', action: 'view_admin_analytics' }, user?.uid);
                    }}
                  >
                    🚀 Website Analytics
                  </button>
                  <button 
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-red-50 transition-colors text-red-600 font-medium"
                    onClick={() => { 
                      setCurrentMode('admin-dashboard'); 
                      setShowMobileMenu(false);
                      WebsiteAnalyticsService.trackClick('button', { text: 'Admin Dashboard', action: 'view_admin_dashboard' }, user?.uid);
                    }}
                  >
                    🔧 Admin Dashboard
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderHomeContent = () => (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      {/* Hero Section - Only show for non-logged-in users */}
      {!user && (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Gentle Background */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, var(--claude-background) 0%, var(--claude-subtle) 50%, var(--claude-surface) 100%)`
        }}>
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234B284E' fill-opacity='0.05'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          
          {/* Gentle floating elements */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{backgroundColor: 'rgba(99, 91, 255, 0.08)'}}></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{backgroundColor: 'rgba(68, 90, 255, 0.08)', animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-2xl animate-pulse" style={{backgroundColor: 'rgba(91, 194, 162, 0.08)', animationDelay: '2s'}}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center py-16">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{
            backgroundColor: 'rgba(91, 194, 162, 0.15)',
            border: '1px solid var(--claude-success)',
            color: 'var(--claude-success)'
          }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor: 'var(--claude-success)'}}></div>
            <span className="text-sm font-semibold">New React Version - Live Now</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8" style={{color: 'var(--heading)'}}>
            Master Any Subject
            <br />
            <span style={{color: 'var(--accent-primary)'}}>with Three‑Sided</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl max-w-4xl mx-auto mb-12 leading-relaxed claude-text-secondary">
            Create, study, and share flashcards with <span style={{color: 'var(--claude-accent)', fontWeight: '600'}}>AI assistance</span>. 
            Learn faster with <span style={{color: 'var(--claude-accent-blue)', fontWeight: '600'}}>spaced repetition</span> and a 
            <span style={{color: 'var(--claude-success)', fontWeight: '600'}}> community library</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => setCurrentMode('search')} 
              className="claude-button-primary group relative min-w-[200px] transform hover:scale-105 transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)',
                boxShadow: '0 8px 32px rgba(155, 139, 115, 0.25)'
              }}
            >
              <span className="relative z-10 flex items-center gap-3">
                <SearchIcon size={20} color="white" />
                <span>Search Flashcards</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            <button 
              onClick={() => setCurrentMode('leaderboard')} 
              className="claude-button-secondary group transform hover:scale-105 transition-all duration-300 min-w-[200px]"
            >
              <span className="flex items-center gap-3">
                <TrophyIcon size={20} color="default" />
                <span>View Leaderboard</span>
              </span>
            </button>
          </div>

          {/* Stats Preview */}
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold" style={{color: 'var(--heading)'}}>500+</div>
              <div className="claude-text-muted">Flashcards</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{color: 'var(--heading)'}}>150+</div>
              <div className="claude-text-muted">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{color: 'var(--heading)'}}>250+</div>
              <div className="claude-text-muted">Public</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-neutral-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-neutral-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>
      )}

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-4 ${user ? 'py-8' : 'py-16'}`}>
        {/* Quick Actions */}
        {user && (
          <div className="relative p-8 mb-16 rounded-3xl bg-neutral-800/50 border border-neutral-700 backdrop-blur-sm shadow-2xl">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
            <div className="relative z-10">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-extrabold mb-3" style={{color: 'var(--claude-heading)'}}>
                  Quick Actions
                </h2>
                <p className="text-neutral-300 text-lg">Jump into your learning journey</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <button 
                  onClick={() => {
                    setCurrentMode('create');
                    WebsiteAnalyticsService.trackClick('homepage_action', { action: 'create_flashcard', location: 'quick_actions' }, user?.uid);
                    WebsiteAnalyticsService.trackFeatureUsage('flashcard', 'create_started', {}, user?.uid);
                  }} 
                  className="claude-card group relative overflow-hidden p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  style={{background: 'linear-gradient(135deg, #D4A574 0%, #C19A6B 100%)'}}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  <div className="relative z-10 text-center text-white">
                    <div className="text-4xl mb-3">
                      <EditIcon size={32} color="white" />
                    </div>
                    <div className="font-bold text-lg mb-1">Create</div>
                    <div className="text-white/90 text-sm">New Flashcard</div>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setCurrentMode('study');
                    WebsiteAnalyticsService.trackClick('homepage_action', { action: 'study_mode', location: 'quick_actions' }, user?.uid);
                    WebsiteAnalyticsService.trackFeatureUsage('study', 'session_started', {}, user?.uid);
                  }} 
                  className="claude-card group relative overflow-hidden p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  style={{background: 'linear-gradient(135deg, #B8A082 0%, #A68B5B 100%)'}}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  <div className="relative z-10 text-center text-white">
                    <div className="text-4xl mb-3">
                      <BookIcon size={32} color="white" />
                    </div>
                    <div className="font-bold text-lg mb-1">Study</div>
                    <div className="text-white/90 text-sm">Practice Mode</div>
                  </div>
                </button>

                <button 
                  onClick={() => setCurrentMode('search')} 
                  className="claude-card group relative overflow-hidden p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  style={{background: 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)'}}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  <div className="relative z-10 text-center text-white">
                    <div className="text-4xl mb-3">
                      <SearchIcon size={32} color="white" />
                    </div>
                    <div className="font-bold text-lg mb-1">Search</div>
                    <div className="text-white/90 text-sm">& Discover</div>
                  </div>
                </button>

                <button 
                  onClick={() => setCurrentMode('dashboard')} 
                  className="claude-card group relative overflow-hidden p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  style={{background: 'linear-gradient(135deg, #7E6B5A 0%, #6D5A4A 100%)'}}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  <div className="relative z-10 text-center text-white">
                    <div className="text-4xl mb-3">
                      <TargetIcon size={32} color="white" />
                    </div>
                    <div className="font-bold text-lg mb-1">Dashboard</div>
                    <div className="text-white/90 text-sm">My Progress</div>
                  </div>
                </button>

                <button 
                  onClick={() => setCurrentMode('decks')} 
                  className="claude-card group relative overflow-hidden p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  style={{background: 'linear-gradient(135deg, #6B5B4A 0%, #5A4A3A 100%)'}}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  <div className="relative z-10 text-center text-white">
                    <div className="text-4xl mb-3">
                      <CardsIcon size={32} color="white" />
                    </div>
                    <div className="font-bold text-lg mb-1">Decks</div>
                    <div className="text-white/90 text-sm">Organize Cards</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-8 mb-16 lg:grid-cols-3">
          <div className="claude-card group relative overflow-hidden p-8 transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#D4A574] to-[#C19A6B] rounded-2xl mb-6 text-4xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                <SocialIcon size={32} color="white" />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--heading)'}}>Community‑Driven</h3>
              <p className="claude-text-secondary leading-relaxed">Discover and share flashcards with students worldwide. Learn from the community's collective knowledge and contribute your own.</p>
            </div>
          </div>

          <div className="claude-card group relative overflow-hidden p-8 transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#B8A082] to-[#A68B5B] rounded-2xl mb-6 text-4xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                <AIBotIcon size={32} color="white" />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--heading)'}}>AI‑Powered Assistance</h3>
              <p className="claude-text-secondary leading-relaxed">Get AI‑generated hints, proofs, and suggestions to help you create better flashcards faster and study more effectively.</p>
            </div>
          </div>

          <div className="claude-card group relative overflow-hidden p-8 transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#9B8B73] to-[#8A7A63] rounded-2xl mb-6 text-4xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                <MathIcon size={32} color="white" />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--heading)'}}>LaTeX Support</h3>
              <p className="claude-text-secondary leading-relaxed">Beautiful mathematical notation with full LaTeX rendering. Use <code>$...$</code> for inline math and <code>$$...$$</code> for display blocks.</p>
            </div>
          </div>
        </div>

        {/* Onboarding - Modern Stepper */}
        <div className="claude-card relative p-8 mb-16 backdrop-blur-sm shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-success-500/5 to-accent-500/5"></div>
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-extrabold mb-3" style={{color: 'var(--heading)'}}>
                Get Started
              </h2>
              <p className="claude-text-secondary text-lg">Complete these quick steps to join our community</p>
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
                    user ? 'bg-success-500 text-white' : 'bg-primary-500'
                  }`}>
                    {user ? <SuccessIcon size={16} color="success" /> : '1'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg mb-1" style={{color: 'var(--heading)'}}>
                      {user ? 'Signed In' : 'Sign In'}
                    </div>
                    <div className="claude-text-secondary text-sm">
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
                    onboardingStatus.hasProfile ? 'bg-success-500 text-white' : 'bg-primary-500'
                  }`}>
                    {onboardingStatus.hasProfile ? <SuccessIcon size={16} color="success" /> : '2'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg mb-1" style={{color: 'var(--heading)'}}>
                      {onboardingStatus.hasProfile ? 'Profile Created' : 'Create Profile'}
                    </div>
                    <div className="claude-text-secondary text-sm">
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
                    onboardingStatus.hasCards ? 'bg-success-500 text-white' : 'bg-primary-500'
                  }`}>
                    {onboardingStatus.hasCards ? <SuccessIcon size={16} color="success" /> : '3'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg mb-1" style={{color: 'var(--heading)'}}>
                      {onboardingStatus.hasCards ? 'First Card Published' : 'Publish First Card'}
                    </div>
                    <div className="claude-text-secondary text-sm">
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
                  className="claude-button-primary px-8 py-4 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  style={{background: 'linear-gradient(135deg, #D4A574 0%, #C19A6B 100%)'}}
                >
                  <EditIcon size={20} color="white" />
                  Create Your First Card
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
            
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6" style={{color: 'var(--heading)'}}>
              Looking for something specific?
            </h2>
            
            <p className="text-xl claude-text-secondary max-w-3xl mx-auto mb-8 leading-relaxed">
              Search our community database of <span style={{color: 'var(--accent-primary)', fontWeight: '600'}}>250+ flashcards</span> from 
              <span style={{color: 'var(--accent-secondary)', fontWeight: '600'}}> students worldwide</span>. Find exactly what you need to ace your studies.
            </p>
            
            <button 
              onClick={() => setCurrentMode('search')} 
              className="claude-button-primary group/btn relative overflow-hidden px-12 py-6 font-semibold text-lg shadow-2xl transform hover:scale-105 transition-all duration-300"
              style={{background: 'linear-gradient(135deg, #9B8B73 0%, #8A7A63 100%)'}}
            >
              <span className="relative z-10 flex items-center gap-3">
                <SearchIcon size={20} color="white" />
                <span>Search Community Flashcards</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>

        {/* Enhanced Footer */}
        <footer className="claude-card relative overflow-hidden mt-24 py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <img 
                  src="/files/three-sided_logo.png" 
                  alt="Three-Sided" 
                  width="48" 
                  height="48" 
                  className="rounded-xl shadow-lg" 
                />
                <span className="text-3xl font-extrabold" style={{color: 'var(--heading)'}}>
                  Three‑Sided
                </span>
              </div>
              <p className="claude-text-secondary text-lg max-w-2xl mx-auto">
                Empowering students worldwide with AI-enhanced flashcards and collaborative learning.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8" style={{borderTop: '1px solid var(--border-light)'}}>
              <div className="claude-text-muted">
                © {new Date().getFullYear()} Three‑Sided. Made with <HeartIcon size={16} color="error" /> for students.
              </div>
              
              <div className="flex items-center gap-8">
                <a 
                  href="mailto:amirbattye@gmail.com" 
                  className="hover:opacity-70 transition-colors duration-200 font-medium"
                  style={{color: 'var(--accent-primary)'}}
                >
                  Contact
                </a>
                <a 
                  href="/latex_guide.html" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:opacity-70 transition-colors duration-200 font-medium"
                  style={{color: 'var(--accent-secondary)'}}
                >
                  LaTeX Guide
                </a>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{
                  backgroundColor: 'rgba(91, 200, 162, 0.1)',
                  color: 'var(--success)'
                }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor: 'var(--success)'}}></div>
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
      <NavBar />
      {renderContent()}
      {/* Modals */}
      <TagSystem isVisible={showTagSystem} onClose={() => setShowTagSystem(false)} selectedTags={[]} onTagsChange={() => {}} />
      <SpacedRepetition isVisible={showSpacedRepetition} onClose={() => setShowSpacedRepetition(false)} />
      <LaTeXConverter isVisible={showLaTeXConverter} onClose={() => setShowLaTeXConverter(false)} />
      <PremiumFeatures isVisible={showPremiumFeatures} onClose={() => setShowPremiumFeatures(false)} />
      
      {/* Session Warning */}
      {sessionWarning && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⏰</span>
              <h3 className="text-lg font-bold text-orange-600">Session Timeout Warning</h3>
            </div>
            <p className="text-gray-700 mb-6">
              Your session will expire soon due to inactivity. Click "Stay Active" to continue, or you'll be signed out automatically.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  dismissSessionWarning();
                  logout();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Sign Out
              </button>
              <button
                onClick={dismissSessionWarning}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Stay Active
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Development Cache Debugger */}
      <CacheDebugger />
    </div>
  )
}

export default App

