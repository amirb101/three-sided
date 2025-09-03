function createCacheService() {
  const memoryCache = {};

  function isValidUser(userId) {
    return typeof userId === "string" && userId.length > 0;
  }

  function getKey(userId) {
    return `cards_${userId}`;
  }

  function getTimeKey(userId) {
    return `${getKey(userId)}_time`;
  }

  return {
    setCards(userId, cards) {
      if (!isValidUser(userId)) return;

      memoryCache[userId] = cards;
      try {
        localStorage.setItem(getKey(userId), JSON.stringify(cards));
        localStorage.setItem(getTimeKey(userId), Date.now().toString());
      } catch (err) {
        console.warn("Cache write error:", err);
      }
    },

    getCards(userId) {
      if (!isValidUser(userId)) return null;

      if (memoryCache[userId]) return memoryCache[userId];

      try {
        const item = localStorage.getItem(getKey(userId));
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) {
                memoryCache[userId] = parsed;
                return parsed;
            }
            } catch (err) {
            console.warn("Cache parse error:", err);
            }
        }
      } catch (err) {
        console.warn("Cache read error:", err);
        memoryCache[userId] = null;
      }

      return null;
    },

    isFresh(userId, maxAgeMs = 1000 * 60 * 60 * 24) {
      if (!isValidUser(userId)) return false;

      const time = parseInt(localStorage.getItem(getTimeKey(userId)), 10);
      return time && (Date.now() - time < maxAgeMs);
    },

    clear(userId) {
      if (!isValidUser(userId)) return;

      delete memoryCache[userId];
      localStorage.removeItem(getKey(userId));
      localStorage.removeItem(getTimeKey(userId));
    }
  };
}

window.createCacheService = createCacheService;
