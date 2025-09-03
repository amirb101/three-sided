import { useState } from 'react';

const Leaderboard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [sortBy, setSortBy] = useState('upvotes');

  const toggleLeaderboard = () => {
    setIsVisible(!isVisible);
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  return (
    <div className="section" id="leaderboardSection" style={{marginTop: '2rem'}}>
      <h2 className="section-title" style={{textAlign: 'center'}}>🏆 Leaderboard</h2>
      <button 
        onClick={toggleLeaderboard}
        className="toggle-btn" 
        style={{
          margin: '0 auto 1rem auto', 
          display: 'block',
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        {isVisible ? '▲ Hide Leaderboard' : '▼ Click to see Leaderboard'}
      </button>
      
      {isVisible && (
        <div id="leaderboardContent">
          <div style={{textAlign: 'right', marginBottom: '0.5rem'}}>
            <label htmlFor="leaderboardSort" style={{fontWeight: 500, color: '#4a5568'}}>
              Sort by:
            </label>
            <select 
              id="leaderboardSort" 
              value={sortBy}
              onChange={handleSortChange}
              style={{
                marginLeft: '0.5rem', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '6px'
              }}
            >
              <option value="upvotes">Upvotes</option>
              <option value="flashcards">Flashcards</option>
              <option value="streak">Streak</option>
            </select>
          </div>
          
          <div style={{overflowX: 'auto'}}>
            <table 
              id="leaderboardTable" 
              className="leaderboard-table" 
              style={{
                width: '100%', 
                background: '#fff', 
                borderRadius: '12px', 
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)', 
                margin: '0 auto'
              }}
            >
              <thead>
                <tr style={{background: '#f7fafc', color: '#4a5568'}}>
                  <th style={{padding: '0.75rem 1rem'}}>#</th>
                  <th style={{padding: '0.75rem 1rem', textAlign: 'left'}}>User</th>
                  <th style={{padding: '0.75rem 1rem'}}>Upvotes</th>
                  <th style={{padding: '0.75rem 1rem'}}>Flashcards</th>
                  <th style={{padding: '0.75rem 1rem'}}>Streak</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', color: '#a0aec0'}}>
                    Loading...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
