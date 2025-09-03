import { useState } from 'react'
import './App.css'
import OnboardingChecklist from './components/OnboardingChecklist'
import SearchWidget from './components/SearchWidget'
import Leaderboard from './components/Leaderboard'
import FlashcardDisplay from './components/FlashcardDisplay'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Three-Sided</h1>
          <p className="hero-subtitle">
            Join a community of STEM students sharing and studying flashcards together. 
            Create, discover, and learn from thousands of user-generated cards with AI-powered assistance.
          </p>
          <div className="hero-cta">
            <a href="/search.html" className="btn btn-primary">
              🔍 Search Flashcards
            </a>
            <a href="/updates.html" className="btn btn-secondary">
              📋 What's New?
            </a>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="main-content">
        <div className="container">
          {/* Features Grid */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3 className="feature-title">Community-Driven</h3>
              <p className="feature-description">Discover and share flashcards with students worldwide. Learn from the community's collective knowledge.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3 className="feature-title">AI-Powered Assistance</h3>
              <p className="feature-description">Get AI-generated hints and proofs to help you create better flashcards faster.</p>
            </div>
            
            <div className="feature-card">
              <a href="/latex_guide.html" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="feature-icon">📐</div>
                <h3 className="feature-title">LaTeX Support</h3>
                <p className="feature-description">Beautiful mathematical notation with full LaTeX rendering. Wrap math in <code>$ $</code> for inline or <code>$$ $$</code> for blocks.</p>
              </a>
            </div>
          </div>

          {/* Onboarding Checklist */}
          <OnboardingChecklist />

          {/* Search Widget */}
          <SearchWidget />

          {/* Leaderboard */}
          <Leaderboard />

          {/* Flashcard Display and Controls */}
          <FlashcardDisplay />

          {/* React Demo Section */}
          <div className="section" style={{marginTop: '2rem', textAlign: 'center'}}>
            <h2 className="section-title">🚀 React Version - Complete!</h2>
            <p style={{fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem'}}>
              This is the complete React version of Three-Sided! All components have been migrated.
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
    </div>
  )
}

export default App
