import { useState } from 'react';

const FlashcardDisplay = () => {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [status, setStatus] = useState('Please log in to start studying...');

  const flip = () => {
    setIsFlipped(!isFlipped);
  };

  const prevCard = () => {
    setCurrentCard(prev => Math.max(0, prev - 1));
    setIsFlipped(false);
  };

  const nextCard = () => {
    setCurrentCard(prev => prev + 1);
    setIsFlipped(false);
  };

  const restartDeck = () => {
    setCurrentCard(0);
    setIsFlipped(false);
    setStatus('Deck restarted!');
  };

  const handleToggleFilter = () => {
    console.log('Toggle filter clicked');
  };

  const handleToggleListPopup = () => {
    console.log('Toggle list popup clicked');
  };

  return (
    <>
      {/* Quick Tip */}
      <div className="auth-section">
        <h3>💡 Quick Start Tip</h3>
        <p>
          Import my sample flashcards above, then refresh this page to start studying immediately. 
          Check out our <a href="/cheatsheet.html" target="_blank" style={{color: '#667eea', fontWeight: 600}}>
            revision resources
          </a> for additional help!
        </p>
      </div>

      {/* Authentication Section */}
      <div className="auth-section" id="authBox">
        <div className="auth-summary">
          <h3>🔐 Account Status</h3>
        </div>
        <div style={{marginTop: '1rem'}}>
          <button className="btn btn-primary" style={{margin: '0.5rem'}}>
            Sign In with Google
          </button>
          <button className="btn btn-secondary" style={{margin: '0.5rem', background: '#0066cc', color: 'white', border: '2px solid #0066cc'}}>
            Log Out
          </button>
        </div>
      </div>

      {/* Profile Button */}
      <div className="profile-btn-wrapper" style={{textAlign: 'center', margin: '1rem 0'}}>
        <button className="btn btn-secondary custom-visible">
          My Public Profile
        </button>
      </div>

      {/* Main Flashcard Display */}
      <div 
        className="flashcard-preview" 
        id="card" 
        onClick={flip}
        style={{
          cursor: 'pointer',
          background: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          margin: '2rem 0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div className="flashcard-content" style={{textAlign: 'center', color: '#718096'}}>
          {status}
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <button onClick={prevCard} className="control-btn">← Previous</button>
        <button onClick={nextCard} className="control-btn">Next →</button>
        <button onClick={restartDeck} className="control-btn">🔄 Restart</button>
        <button onClick={handleToggleFilter} className="control-btn">🏷️ Filter</button>
        <button onClick={handleToggleListPopup} className="control-btn">📋 View All</button>
        <button onClick={() => window.location.href = '/sr.html'} className="control-btn">🎯 Spaced Repetition</button>
      </div>

      <div id="status" style={{textAlign: 'center', margin: '1rem 0', color: '#718096'}}>
        {status}
      </div>
    </>
  );
};

export default FlashcardDisplay;
