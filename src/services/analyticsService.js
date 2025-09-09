import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  writeBatch,
  setDoc,
  arrayUnion
} from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { db, analytics } from '../firebase';

export class AnalyticsService {
  // Helper function to check if error is due to missing permissions/index
  static isPermissionOrIndexError(error) {
    const message = error.message || '';
    return message.includes('Missing or insufficient permissions') ||
           message.includes('requires an index') ||
           message.includes('permission-denied');
  }

  // ==========================================
  // STUDY SESSION TRACKING
  // ==========================================

  /**
   * Start a new study session
   */
  static async startStudySession(userId, options = {}) {
    try {
      const sessionData = {
        userId,
        sessionId: this.generateSessionId(),
        startTime: serverTimestamp(),
        
        // Session context
        mode: options.mode || 'study',
        deckId: options.deckId || null,
        deckName: options.deckName || null,
        
        // Initialize counters
        cardsStudied: 0,
        cardsCorrect: 0,
        cardsIncorrect: 0,
        cardResults: [],
        
        // Status
        isActive: true
      };

      const sessionRef = await addDoc(collection(db, 'studySessions'), sessionData);
      
      // Track with Firebase Analytics
      if (analytics) {
        try {
          logEvent(analytics, 'study_session_start', {
            mode: options.mode,
            deck_id: options.deckId,
            user_id: userId
          });
        } catch (error) {
          console.warn('Firebase Analytics not available:', error);
        }
      }

      return { id: sessionRef.id, ...sessionData };
    } catch (error) {
      console.error('Error starting study session:', error);
      throw error;
    }
  }

  /**
   * End a study session and calculate metrics
   */
  static async endStudySession(sessionId, userId) {
    try {
      const sessionRef = doc(db, 'studySessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = sessionDoc.data();
      const startTime = sessionData.startTime.toMillis();
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      // Calculate metrics
      const accuracy = sessionData.cardsStudied > 0 
        ? sessionData.cardsCorrect / sessionData.cardsStudied 
        : 0;
      
      const averageTimePerCard = sessionData.cardsStudied > 0 
        ? duration / sessionData.cardsStudied 
        : 0;

      // Update session
      await updateDoc(sessionRef, {
        endTime: serverTimestamp(),
        duration,
        accuracy,
        averageTimePerCard,
        isActive: false
      });

      // Update user analytics
      await this.updateUserAnalytics(userId, {
        sessionDuration: duration,
        cardsStudied: sessionData.cardsStudied,
        accuracy,
        deckId: sessionData.deckId
      });

      // Update daily stats
      await this.updateDailyStats(userId, {
        studyTime: duration,
        sessionsCount: 1,
        cardsStudied: sessionData.cardsStudied,
        accuracy
      });

      // Track with Firebase Analytics
      if (analytics) {
        try {
          logEvent(analytics, 'study_session_end', {
          duration,
          cards_studied: sessionData.cardsStudied,
          accuracy,
          user_id: userId
          });
        } catch (error) {
          console.warn('Firebase Analytics not available:', error);
        }
      }

      return {
        duration,
        cardsStudied: sessionData.cardsStudied,
        accuracy,
        averageTimePerCard
      };
    } catch (error) {
      // Suppress permission/index errors to avoid console spam
      if (this.isPermissionOrIndexError(error)) {
        return {
          duration: 0,
          cardsStudied: 0,
          accuracy: 0,
          averageTimePerCard: 0
        };
      }
      console.error('Error ending study session:', error);
      throw error;
    }
  }

  /**
   * Record a card answer in the current session
   */
  static async recordCardAnswer(sessionId, cardData) {
    try {
      const sessionRef = doc(db, 'studySessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const batch = writeBatch(db);

      // Update session with card result
      const cardResult = {
        cardId: cardData.cardId,
        timeSpent: cardData.timeSpent,
        wasCorrect: cardData.wasCorrect,
        attempts: cardData.attempts || 1,
        difficulty: cardData.difficulty || 'medium',
        confidenceLevel: cardData.confidenceLevel || 3,
        timestamp: serverTimestamp()
      };

      batch.update(sessionRef, {
        cardsStudied: arrayUnion(cardResult),
        [`cards${cardData.wasCorrect ? 'Correct' : 'Incorrect'}`]: 
          (sessionDoc.data()[`cards${cardData.wasCorrect ? 'Correct' : 'Incorrect'}`] || 0) + 1
      });

      // Update card learning progress
      await this.updateCardProgress(cardData.userId, cardData.cardId, {
        wasCorrect: cardData.wasCorrect,
        timeSpent: cardData.timeSpent,
        confidenceLevel: cardData.confidenceLevel
      });

      await batch.commit();

      // Track with Firebase Analytics
      if (analytics) {
        try {
          logEvent(analytics, 'card_answered', {
          card_id: cardData.cardId,
          was_correct: cardData.wasCorrect,
          time_spent: cardData.timeSpent,
          user_id: cardData.userId
          });
        } catch (error) {
          console.warn('Firebase Analytics not available:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error recording card answer:', error);
      throw error;
    }
  }

  // ==========================================
  // LEARNING PROGRESS TRACKING
  // ==========================================

  /**
   * Update learning progress for a specific card
   */
  static async updateCardProgress(userId, cardId, answerData) {
    try {
      const progressRef = doc(db, 'learningProgress', userId, 'cards', cardId);
      const progressDoc = await getDoc(progressRef);

      let progressData;
      if (progressDoc.exists()) {
        progressData = progressDoc.data();
      } else {
        progressData = {
          cardId,
          userId,
          totalReviews: 0,
          correctReviews: 0,
          accuracy: 0,
          averageTimeToAnswer: 0,
          fastestTime: Infinity,
          slowestTime: 0,
          masteryLevel: 0,
          improvementRate: 0,
          createdAt: serverTimestamp()
        };
      }

      // Update metrics
      progressData.totalReviews += 1;
      if (answerData.wasCorrect) {
        progressData.correctReviews += 1;
      }
      
      progressData.accuracy = progressData.correctReviews / progressData.totalReviews;
      
      // Update timing
      const timeSpent = answerData.timeSpent;
      progressData.averageTimeToAnswer = (
        (progressData.averageTimeToAnswer * (progressData.totalReviews - 1)) + timeSpent
      ) / progressData.totalReviews;
      
      progressData.fastestTime = Math.min(progressData.fastestTime, timeSpent);
      progressData.slowestTime = Math.max(progressData.slowestTime, timeSpent);

      // Calculate mastery level (0-1 scale)
      // Based on accuracy, consistency, and recent performance
      const accuracyScore = progressData.accuracy;
      const consistencyScore = 1 - (progressData.slowestTime - progressData.fastestTime) / progressData.slowestTime;
      const confidenceScore = (answerData.confidenceLevel || 3) / 5;
      
      progressData.masteryLevel = (accuracyScore * 0.5) + (consistencyScore * 0.3) + (confidenceScore * 0.2);
      progressData.lastMasteryUpdate = serverTimestamp();

      await setDoc(progressRef, progressData, { merge: true });

      return progressData;
    } catch (error) {
      console.error('Error updating card progress:', error);
      throw error;
    }
  }

  /**
   * Get learning progress for a user's cards
   */
  static async getCardProgress(userId, cardIds = null) {
    try {
      const progressCollection = collection(db, 'learningProgress', userId, 'cards');
      let q = progressCollection;

      if (cardIds && cardIds.length > 0) {
        q = query(progressCollection, where('cardId', 'in', cardIds));
      }

      const snapshot = await getDocs(q);
      const progress = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        progress[data.cardId] = data;
      });

      return progress;
    } catch (error) {
      // Suppress permission/index errors to avoid console spam
      if (this.isPermissionOrIndexError(error)) {
        return {};
      }
      console.error('Error getting card progress:', error);
      throw error;
    }
  }

  // ==========================================
  // USER ANALYTICS AGGREGATION
  // ==========================================

  /**
   * Update overall user analytics
   */
  static async updateUserAnalytics(userId, sessionData) {
    try {
      const analyticsRef = doc(db, 'userAnalytics', userId);
      const analyticsDoc = await getDoc(analyticsRef);

      let analytics;
      if (analyticsDoc.exists()) {
        analytics = analyticsDoc.data();
      } else {
        analytics = {
          userId,
          totalStudyTime: 0,
          totalSessions: 0,
          studyStreak: 0,
          longestStreak: 0,
          overallAccuracy: 0,
          improvementRate: 0,
          subjectStats: {},
          deckStats: {},
          createdAt: serverTimestamp()
        };
      }

      // Update session stats
      analytics.totalStudyTime += sessionData.sessionDuration;
      analytics.totalSessions += 1;

      // Update accuracy (weighted average)
      analytics.overallAccuracy = (
        (analytics.overallAccuracy * (analytics.totalSessions - 1)) + sessionData.accuracy
      ) / analytics.totalSessions;

      // Update deck stats
      if (sessionData.deckId) {
        if (!analytics.deckStats[sessionData.deckId]) {
          analytics.deckStats[sessionData.deckId] = {
            studyTime: 0,
            sessions: 0,
            accuracy: 0
          };
        }
        
        const deckStats = analytics.deckStats[sessionData.deckId];
        deckStats.studyTime += sessionData.sessionDuration;
        deckStats.sessions += 1;
        deckStats.accuracy = (
          (deckStats.accuracy * (deckStats.sessions - 1)) + sessionData.accuracy
        ) / deckStats.sessions;
      }

      analytics.lastUpdated = serverTimestamp();

      await setDoc(analyticsRef, analytics, { merge: true });
      return analytics;
    } catch (error) {
      console.error('Error updating user analytics:', error);
      throw error;
    }
  }

  /**
   * Update daily statistics
   */
  static async updateDailyStats(userId, dailyData) {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyRef = doc(db, 'dailyStats', userId, 'days', today);
      const dailyDoc = await getDoc(dailyRef);

      let stats;
      if (dailyDoc.exists()) {
        stats = dailyDoc.data();
      } else {
        stats = {
          date: today,
          userId,
          studyTime: 0,
          sessionsCount: 0,
          cardsStudied: 0,
          accuracy: 0,
          decksStudied: [],
          subjectsStudied: []
        };
      }

      // Update stats
      stats.studyTime += dailyData.studyTime;
      stats.sessionsCount += dailyData.sessionsCount;
      stats.cardsStudied += dailyData.cardsStudied;
      
      // Update accuracy (weighted average)
      if (stats.sessionsCount > 0) {
        stats.accuracy = (
          (stats.accuracy * (stats.sessionsCount - 1)) + dailyData.accuracy
        ) / stats.sessionsCount;
      }

      await setDoc(dailyRef, stats, { merge: true });
      return stats;
    } catch (error) {
      console.error('Error updating daily stats:', error);
      throw error;
    }
  }

  // ==========================================
  // INSIGHTS AND REPORTING
  // ==========================================

  /**
   * Get user learning insights
   */
  static async getUserInsights(userId, timeframe = 'week') {
    try {
      const [userAnalytics, recentSessions, cardProgress] = await Promise.all([
        this.getUserAnalytics(userId),
        this.getRecentSessions(userId, timeframe),
        this.getCardProgress(userId)
      ]);

      // Calculate insights
      const insights = {
        // Performance trends
        accuracyTrend: this.calculateTrend(recentSessions, 'accuracy'),
        studyTimeTrend: this.calculateTrend(recentSessions, 'duration'),
        
        // Learning efficiency
        masteryProgress: this.calculateMasteryProgress(cardProgress),
        strugglingCards: this.identifyStrugglingCards(cardProgress),
        strongSubjects: this.identifyStrongSubjects(userAnalytics.subjectStats),
        
        // Study habits
        optimalStudyTime: this.identifyOptimalStudyTime(recentSessions),
        consistencyScore: this.calculateConsistencyScore(recentSessions),
        
        // Recommendations
        recommendations: this.generateRecommendations(userAnalytics, cardProgress)
      };

      return insights;
    } catch (error) {
      // Suppress permission/index errors to avoid console spam
      if (this.isPermissionOrIndexError(error)) {
        return {
          studyStreaks: { current: 0, longest: 0 },
          totalStudyTime: 0,
          averageAccuracy: 0,
          cardsStudied: 0,
          sessionsCompleted: 0,
          improvementTrend: 'stable',
          weeklyProgress: [],
          strongSubjects: [],
          weakSubjects: []
        };
      }
      console.error('Error getting user insights:', error);
      throw error;
    }
  }

  /**
   * Get recent study sessions
   */
  static async getRecentSessions(userId, timeframe = 'week') {
    try {
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 1;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const q = query(
        collection(db, 'studySessions'),
        where('userId', '==', userId),
        where('startTime', '>=', cutoffDate),
        where('isActive', '==', false),
        orderBy('startTime', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      // Suppress permission/index errors to avoid console spam
      if (this.isPermissionOrIndexError(error)) {
        return [];
      }
      console.error('Error getting recent sessions:', error);
      return [];
    }
  }

  /**
   * Get user analytics
   */
  static async getUserAnalytics(userId) {
    try {
      const analyticsRef = doc(db, 'userAnalytics', userId);
      const analyticsDoc = await getDoc(analyticsRef);
      
      if (analyticsDoc.exists()) {
        return analyticsDoc.data();
      } else {
        return {
          totalStudyTime: 0,
          totalSessions: 0,
          overallAccuracy: 0,
          studyStreak: 0,
          subjectStats: {},
          deckStats: {}
        };
      }
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  static generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static calculateTrend(sessions, metric) {
    if (sessions.length < 2) return 0;
    
    const recent = sessions.slice(0, Math.floor(sessions.length / 2));
    const older = sessions.slice(Math.floor(sessions.length / 2));
    
    const recentAvg = recent.reduce((sum, s) => sum + (s[metric] || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + (s[metric] || 0), 0) / older.length;
    
    return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  }

  static calculateMasteryProgress(cardProgress) {
    const cards = Object.values(cardProgress);
    if (cards.length === 0) return 0;
    
    return cards.reduce((sum, card) => sum + (card.masteryLevel || 0), 0) / cards.length;
  }

  static identifyStrugglingCards(cardProgress) {
    return Object.values(cardProgress)
      .filter(card => card.accuracy < 0.6 && card.totalReviews >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);
  }

  static identifyStrongSubjects(subjectStats) {
    return Object.entries(subjectStats)
      .filter(([_, stats]) => stats.accuracy > 0.8)
      .sort(([_, a], [__, b]) => b.accuracy - a.accuracy)
      .slice(0, 3)
      .map(([subject, _]) => subject);
  }

  static identifyOptimalStudyTime(sessions) {
    // Analyze when user has best performance
    const timeSlots = { morning: [], afternoon: [], evening: [] };
    
    sessions.forEach(session => {
      const hour = new Date(session.startTime.toMillis()).getHours();
      let slot = 'afternoon';
      if (hour < 12) slot = 'morning';
      else if (hour > 18) slot = 'evening';
      
      timeSlots[slot].push(session.accuracy || 0);
    });

    let bestTime = 'afternoon';
    let bestAccuracy = 0;

    Object.entries(timeSlots).forEach(([time, accuracies]) => {
      if (accuracies.length > 0) {
        const avgAccuracy = accuracies.reduce((a, b) => a + b) / accuracies.length;
        if (avgAccuracy > bestAccuracy) {
          bestAccuracy = avgAccuracy;
          bestTime = time;
        }
      }
    });

    return bestTime;
  }

  static calculateConsistencyScore(sessions) {
    if (sessions.length < 3) return 0;
    
    const durations = sessions.map(s => s.duration || 0);
    const avg = durations.reduce((a, b) => a + b) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - (stdDev / avg));
  }

  static generateRecommendations(userAnalytics, cardProgress) {
    const recommendations = [];
    
    // Study time recommendations
    if (userAnalytics.totalStudyTime < 3600) { // Less than 1 hour total
      recommendations.push({
        type: 'study_time',
        title: 'Increase Study Time',
        description: 'Try to study for at least 20 minutes per day to see better results.',
        priority: 'high'
      });
    }

    // Accuracy recommendations
    if (userAnalytics.overallAccuracy < 0.7) {
      recommendations.push({
        type: 'accuracy',
        title: 'Focus on Understanding',
        description: 'Review the hints and explanations more carefully before answering.',
        priority: 'high'
      });
    }

    // Struggling cards
    const strugglingCards = this.identifyStrugglingCards(cardProgress);
    if (strugglingCards.length > 0) {
      recommendations.push({
        type: 'struggling_cards',
        title: 'Review Difficult Cards',
        description: `You have ${strugglingCards.length} cards that need extra attention.`,
        priority: 'medium'
      });
    }

    return recommendations;
  }
}
