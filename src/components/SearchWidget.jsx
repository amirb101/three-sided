const SearchWidget = () => {
  return (
    <div className="section" style={{marginTop: '2rem'}}>
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
  );
};

export default SearchWidget;
