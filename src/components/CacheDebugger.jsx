import { useState, useEffect } from 'react';
import globalCache from '../services/cacheService';

const CacheDebugger = () => {
  const [stats, setStats] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'production') {
      const interval = setInterval(() => {
        setStats(globalCache.getStats());
      }, 2000);

      return () => clearInterval(interval);
    }
  }, []);

  // Only render in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded text-xs z-50"
      >
        Cache Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Cache Stats</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-300 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      {stats && (
        <div className="space-y-1">
          <div>Total Entries: {stats.totalEntries}</div>
          <div>Valid: {stats.validEntries}</div>
          <div>Expired: {stats.expiredEntries}</div>
          <div>Size: {stats.totalSizeKB} KB</div>
          <div>Hit Rate: {(stats.hitRate * 100).toFixed(1)}%</div>
        </div>
      )}
      
      <div className="mt-3 space-y-1">
        <button
          onClick={() => {
            globalCache.clear();
            setStats(globalCache.getStats());
          }}
          className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs w-full"
        >
          Clear Cache
        </button>
        <button
          onClick={() => {
            globalCache.cleanup();
            setStats(globalCache.getStats());
          }}
          className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-xs w-full"
        >
          Cleanup Expired
        </button>
      </div>
    </div>
  );
};

export default CacheDebugger;
