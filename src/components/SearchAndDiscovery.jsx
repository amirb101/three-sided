import { useState, useEffect } from 'react';
import { FlashcardService } from '../services/flashcardService';

const SearchAndDiscovery = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState({ subject: '', sortBy: 'newest' });

  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    (async () => {
      const subs = await FlashcardService.getSubjects();
      setSubjects(subs || []);
    })();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await FlashcardService.searchFlashcards(searchQuery, filters);
      setSearchResults(results);
    } catch (e) {
      console.error('Search error', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearAll = () => {
    setSearchQuery('');
    setFilters({ subject: '', difficulty: '', sortBy: 'newest' });
    setSearchResults([]);
  };

  return (
    <div className="container section">
      <div className="card p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">🔍 Search Flashcards</h2>
        <p className="subtle mb-4">Find flashcards by topic, question text, or tags.</p>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input flex-1"
            placeholder="e.g. linear algebra, chain rule, eigenvalues"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} className="btn btn-primary whitespace-nowrap">
            {isSearching ? 'Searching…' : 'Search'}
          </button>
          <button onClick={clearAll} className="btn btn-secondary whitespace-nowrap">Clear</button>
        </div>

        <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'0.5rem'}}>
          <select value={filters.subject} onChange={(e)=>setFilters({...filters, subject:e.target.value})} className="select">
            <option value="">All subjects</option>
            {subjects.map((s)=> <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.sortBy} onChange={(e)=>setFilters({...filters, sortBy:e.target.value})} className="select">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="popular">Most popular</option>
          </select>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Results {searchResults.length ? `(${searchResults.length})` : ''}</h3>
        </div>

        {isSearching ? (
          <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'1rem'}}>
            {Array.from({length:6}).map((_,i)=> (
              <div key={i} className="card" style={{padding:'1rem', background:'rgba(255,255,255,0.04)'}}>
                <div style={{height:'16px', background:'rgba(255,255,255,0.08)', borderRadius:'6px', marginBottom:'8px'}}></div>
                <div style={{height:'12px', background:'rgba(255,255,255,0.06)', borderRadius:'6px', marginBottom:'8px'}}></div>
                <div style={{height:'12px', width:'60%', background:'rgba(255,255,255,0.06)', borderRadius:'6px'}}></div>
              </div>
            ))}
          </div>
        ) : searchResults.length === 0 ? (
          <div className="subtle" style={{textAlign:'center', padding:'2rem'}}>Type a query and press Search to see results.</div>
        ) : (
          <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'1rem'}}>
            {searchResults.map((card) => (
              <div key={card.id} className="card p-4 hover-lift">
                <h4 className="font-semibold mb-2" style={{color:'#e5e7eb'}}>
                  {card.question?.length > 110 ? card.question.slice(0,110) + '…' : card.question}
                </h4>
                <p className="subtle mb-3" style={{fontSize:'0.95rem'}}>
                  {card.answer?.length > 140 ? card.answer.slice(0,140) + '…' : card.answer}
                </p>
                <div className="subtle" style={{display:'flex', justifyContent:'flex-end', fontSize:'0.85rem'}}>
                  <span>{card.subject || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchAndDiscovery;
