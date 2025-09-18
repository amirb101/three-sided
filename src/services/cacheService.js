/**
 * Global Cache Service for Firebase Data
 * Reduces redundant Firebase reads and improves performance
 */

class GlobalCacheService {
  constructor() {
    this.cache = new Map();
    this.lastCleanup = Date.now();
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    
    // Different cache durations for different data types
    this.cacheDurations = {
      userProfile: 10 * 60 * 1000,    // 10 minutes
      userFlashcards: 2 * 60 * 1000,  // 2 minutes  
      publicCards: 5 * 60 * 1000,     // 5 minutes
      userUpvotes: 1 * 60 * 1000,     // 1 minute
      userImports: 1 * 60 * 1000,     // 1 minute
      leaderboard: 5 * 60 * 1000,     // 5 minutes
      communityStats: 10 * 60 * 1000, // 10 minutes
      userDecks: 3 * 60 * 1000,       // 3 minutes
      deckCards: 2 * 60 * 1000,       // 2 minutes
      tags: 15 * 60 * 1000,           // 15 minutes (rarely change)
    };
    
    // Auto cleanup old entries
    this.startAutoCleanup();
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/missing
   */
  get(key) {
    this.maybeCleanup();
    
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.duration) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access time for LRU
    cached.lastAccessed = now;
    console.log(`🔄 Cache HIT for: ${key}`);
    return cached.data;
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {string} type - Data type for duration lookup
   */
  set(key, data, type = 'default') {
    const duration = this.cacheDurations[type] || 5 * 60 * 1000; // default 5 min
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      lastAccessed: now,
      duration,
      type
    });
    
    console.log(`💾 Cache SET for: ${key} (${type}, ${duration/1000}s TTL)`);
  }

  /**
   * Invalidate specific cache entries
   * @param {string|RegExp} keyPattern - Key or pattern to invalidate
   */
  invalidate(keyPattern) {
    if (typeof keyPattern === 'string') {
      this.cache.delete(keyPattern);
      console.log(`🗑️ Cache INVALIDATED: ${keyPattern}`);
      return;
    }
    
    // Pattern-based invalidation
    const keysToDelete = [];
    for (const [key] of this.cache) {
      if (keyPattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log(`🗑️ Cache INVALIDATED: ${key}`);
    });
  }

  /**
   * Invalidate all cache entries for a user
   * @param {string} userId - User ID
   */
  invalidateUser(userId) {
    this.invalidate(new RegExp(`^user_${userId}_`));
  }

  /**
   * Invalidate all public data caches
   */
  invalidatePublic() {
    this.invalidate(new RegExp('^public_'));
  }

  /**
   * Get cache stats
   * @returns {Object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;
    
    for (const [key, cached] of this.cache) {
      if (now - cached.timestamp > cached.duration) {
        expiredEntries++;
      } else {
        validEntries++;
      }
      totalSize += JSON.stringify(cached.data).length;
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      totalSizeKB: Math.round(totalSize / 1024),
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    console.log('🧹 Cache CLEARED');
  }

  /**
   * Start automatic cleanup of expired entries
   */
  startAutoCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, cached] of this.cache) {
      if (now - cached.timestamp > cached.duration) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
    
    this.lastCleanup = now;
  }

  /**
   * Maybe run cleanup if it's been a while
   */
  maybeCleanup() {
    if (Date.now() - this.lastCleanup > this.cleanupInterval) {
      this.cleanup();
    }
  }

  /**
   * Generate cache key for user data
   * @param {string} userId - User ID
   * @param {string} dataType - Type of data
   * @param {string} suffix - Optional suffix
   * @returns {string} Cache key
   */
  userKey(userId, dataType, suffix = '') {
    return `user_${userId}_${dataType}${suffix ? '_' + suffix : ''}`;
  }

  /**
   * Generate cache key for public data
   * @param {string} dataType - Type of data
   * @param {string} suffix - Optional suffix
   * @returns {string} Cache key
   */
  publicKey(dataType, suffix = '') {
    return `public_${dataType}${suffix ? '_' + suffix : ''}`;
  }

  /**
   * Cached async function wrapper
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {string} type - Cache type for duration
   * @returns {Promise<any>} Cached or fresh data
   */
  async getOrFetch(key, fetchFn, type = 'default') {
    // Try to get from cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    console.log(`📡 Cache MISS for: ${key} - fetching fresh data`);
    
    try {
      // Fetch fresh data
      const data = await fetchFn();
      
      // Cache the result
      this.set(key, data, type);
      
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch data for cache key: ${key}`, error);
      throw error;
    }
  }
}

// Create singleton instance
const globalCache = new GlobalCacheService();

export default globalCache;

// Export convenience methods
export const {
  get: getCached,
  set: setCached,
  invalidate,
  invalidateUser,
  invalidatePublic,
  clear: clearCache,
  getStats: getCacheStats,
  userKey,
  publicKey,
  getOrFetch
} = globalCache;
