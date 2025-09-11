import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

const BrokenCardsReview = () => {
  const [brokenCards, setBrokenCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCards, setTotalCards] = useState(0);
  const [deletingCards, setDeletingCards] = useState(new Set());

  const findBrokenCards = async () => {
    setLoading(true);
    try {
      const findFunction = httpsCallable(functions, 'findBrokenCards');
      const result = await findFunction();
      
      const data = result.data;
      setBrokenCards(data.brokenCards || []);
      setTotalCards(data.totalCards || 0);
      
    } catch (error) {
      console.error('Error finding broken cards:', error);
      alert(`❌ Failed to find broken cards: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteCard = async (cardId, cardSlug) => {
    if (!confirm(`Are you sure you want to delete this card?\n\nID: ${cardId}\nSlug: ${cardSlug || 'MISSING'}\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingCards(prev => new Set(prev).add(cardId));
    
    try {
      const deleteFunction = httpsCallable(functions, 'deleteCard');
      await deleteFunction({ cardId, cardSlug });
      
      // Remove the card from the list
      setBrokenCards(prev => prev.filter(card => card.id !== cardId));
      
    } catch (error) {
      console.error('Error deleting card:', error);
      alert(`❌ Failed to delete card: ${error.message}`);
    } finally {
      setDeletingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const deleteAllBroken = async () => {
    if (brokenCards.length === 0) return;
    
    if (!confirm(`⚠️ DANGER: Delete ALL ${brokenCards.length} broken cards?\n\nThis will permanently delete all cards with missing/broken slugs.\n\nThis action cannot be undone. Are you absolutely sure?`)) {
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const card of brokenCards) {
      try {
        const deleteFunction = httpsCallable(functions, 'deleteCard');
        await deleteFunction({ cardId: card.id, cardSlug: card.slug });
        successCount++;
      } catch (error) {
        console.error(`Failed to delete card ${card.id}:`, error);
        failCount++;
      }
    }

    setBrokenCards([]);
    setLoading(false);
    
    alert(`✅ Bulk delete completed!\n\n✅ Deleted: ${successCount}\n❌ Failed: ${failCount}`);
  };

  useEffect(() => {
    findBrokenCards();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">🔍 Broken Cards Review</h3>
          <button
            onClick={findBrokenCards}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : '🔄 Refresh'}
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalCards}</div>
              <div className="text-sm text-gray-600">Total Cards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{brokenCards.length}</div>
              <div className="text-sm text-gray-600">Broken Cards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{totalCards - brokenCards.length}</div>
              <div className="text-sm text-gray-600">Healthy Cards</div>
            </div>
          </div>
        </div>

        {brokenCards.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-yellow-800">⚠️ Found {brokenCards.length} broken cards</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  These cards have missing or invalid slugs and show as "undefined" when users try to view them.
                </p>
              </div>
              <button
                onClick={deleteAllBroken}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                🗑️ Delete All Broken
              </button>
            </div>
          </div>
        )}

        {loading && brokenCards.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Searching for broken cards...</p>
          </div>
        ) : brokenCards.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">✅</div>
            <h4 className="text-lg font-medium text-green-600 mb-1">No broken cards found!</h4>
            <p className="text-gray-600">All cards have valid slugs and are working properly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {brokenCards.map((card) => (
              <div key={card.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-red-600">
                        ID: {card.id}
                      </span>
                      <span className="text-sm font-mono bg-red-100 px-2 py-1 rounded text-red-700">
                        Slug: {card.slug || 'MISSING'}
                      </span>
                      {card.isBotPost && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          🤖 Bot Post
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <strong className="text-sm text-gray-700">Statement:</strong>
                        <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-2 rounded">
                          {card.statement.length > 200 ? card.statement.substring(0, 200) + '...' : card.statement}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                        <div>
                          <strong>Views:</strong> {card.viewCount}
                        </div>
                        <div>
                          <strong>Likes:</strong> {card.likeCount}
                        </div>
                        <div>
                          <strong>Author:</strong> {card.authorId?.substring(0, 8) || 'Unknown'}...
                        </div>
                        <div>
                          <strong>Created:</strong> {formatDate(card.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteCard(card.id, card.slug)}
                    disabled={deletingCards.has(card.id)}
                    className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {deletingCards.has(card.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        🗑️ Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrokenCardsReview;
