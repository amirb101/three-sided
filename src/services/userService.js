import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { ProfileService } from './profileService';
import { DeckService } from './deckService';

export class UserService {
  // Get user profile (uses ProfileService for compatibility with old system)
  static async getUserProfile(userId) {
    try {
      // Use ProfileService which follows the old system's schema
      return await ProfileService.getProfileByUserId(userId);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Create or update user profile
  static async createUserProfile(userId, userData) {
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPremium: false,
        flashcardCount: 0,
        upvotes: 0,
        streak: 0
      });
      
      return userId;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateUserProfile(userId, updates) {
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get user stats
  static async getUserStats(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return null;

      // Get user's flashcards count from multiple collections
      const flashcardsQueries = [
        query(collection(db, 'cards'), where('userId', '==', userId)),
        query(collection(db, 'flashcards'), where('userId', '==', userId)),
        query(collection(db, 'publicCards'), where('userId', '==', userId))
      ];
      
      const [cardsSnap, flashcardsSnap, publicCardsSnap] = await Promise.all(
        flashcardsQueries.map(q => getDocs(q))
      );
      
      const flashcardCount = cardsSnap.size + flashcardsSnap.size + publicCardsSnap.size;

      // Simulate some achievements based on activity
      const achievements = [];
      if (flashcardCount > 0) achievements.push('first_card');
      if (flashcardCount >= 10) achievements.push('ten_cards');
      if (flashcardCount >= 100) achievements.push('hundred_cards');
      if (profile.upvotesReceived > 50) achievements.push('popular_creator');

      return {
        ...profile,
        flashcardCount,
        achievements,
        studySessions: Math.floor(Math.random() * 20) + 1, // Simulated for now
        followers: Math.floor(Math.random() * 100), // Simulated for now
        rating: (Math.random() * 2 + 3).toFixed(1) // Simulated 3-5 rating
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  // Check if user has completed onboarding
  static async checkOnboardingStatus(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return { hasProfile: false, hasCards: false };

      // Check if user has created any flashcards
      const flashcardsQuery = query(
        collection(db, 'flashcards'),
        where('authorId', '==', userId),
        limit(1)
      );
      const flashcardsSnapshot = await getDocs(flashcardsQuery);
      const hasCards = !flashcardsSnapshot.empty;

      return {
        hasProfile: true,
        hasCards,
        profile
      };
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      throw error;
    }
  }

  // Get top users for leaderboard
  static async getTopUsers(resultLimit = 20, timeframe = 'allTime') {
    try {
      // Basic leaderboard by flashcardCount then upvotes
      const q = query(
        collection(db, 'users'),
        orderBy('flashcardCount', 'desc'),
        orderBy('upvotes', 'desc'),
        limit(resultLimit)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error fetching top users:', error);
      return [];
    }
  }

  // Get study history for a user
  static async getStudyHistory(userId) {
    try {
      // Import AnalyticsService to get real study history
      const { AnalyticsService } = await import('./analyticsService');
      
      // Get recent study sessions from AnalyticsService
      const recentSessions = await AnalyticsService.getRecentSessions(userId, 'month');
      
      // Transform sessions into study history format
      const studyHistory = recentSessions.map(session => {
        const sessionDate = session.startTime?.toDate ? 
          session.startTime.toDate() : 
          new Date(session.startTime);
        
        return {
          date: sessionDate.toISOString().split('T')[0], // YYYY-MM-DD format
          duration: session.duration || 0,
          cardsStudied: session.cardsStudied || 0,
          accuracy: Math.round((session.accuracy || 0) * 100) // Convert to percentage
        };
      });

      // Sort by date (most recent first)
      studyHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      return studyHistory;
    } catch (error) {
      console.error('Error fetching study history:', error);
      // Fallback to empty array if analytics fails
      return [];
    }
  }

  // ==========================================
  // DECK MIGRATION FUNCTIONS
  // ==========================================

  /**
   * Check if user needs deck migration
   */
  static async needsDeckMigration(userId) {
    try {
      // Check if user has any decks
      const userDecks = await DeckService.getUserDecks(userId);
      
      if (userDecks.length > 0) {
        return false; // Already has decks, no migration needed
      }

      // Check if user has any cards that need migration
      const userCardsQuery = query(
        collection(db, 'cards'),
        where('userId', '==', userId),
        limit(1)
      );
      const userCardsSnap = await getDocs(userCardsQuery);

      const legacyCardsQuery = query(
        collection(db, 'flashcards'),
        where('userId', '==', userId),
        limit(1)
      );
      const legacyCardsSnap = await getDocs(legacyCardsQuery);

      return !userCardsSnap.empty || !legacyCardsSnap.empty;
    } catch (error) {
      console.error('Error checking deck migration status:', error);
      return false;
    }
  }

  /**
   * Migrate user to deck system
   */
  static async migrateUserToDecks(userId) {
    try {
      console.log(`🚀 Starting deck migration for user: ${userId}`);

      // Check if migration is needed
      const needsMigration = await this.needsDeckMigration(userId);
      if (!needsMigration) {
        console.log('✅ User already migrated or has no cards');
        return { success: true, message: 'No migration needed' };
      }

      // Perform the migration
      const migrationResult = await DeckService.migrateCardsToDefaultDeck(userId);
      
      // Store migration status (create user doc if doesn't exist)
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        deckMigrationCompleted: true,
        deckMigrationDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log(`✅ Deck migration completed for user: ${userId}`);
      console.log(`📊 Migration stats:`, migrationResult);

      return {
        success: true,
        message: `Successfully migrated ${migrationResult.migratedCount} cards`,
        migrationResult
      };
    } catch (error) {
      console.error('Error migrating user to decks:', error);
      
      // Log migration failure
      try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          deckMigrationFailed: true,
          deckMigrationError: error.message,
          deckMigrationAttemptDate: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (logError) {
        console.error('Failed to log migration error:', logError);
      }

      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        error
      };
    }
  }

  /**
   * Auto-migrate user on login/app load
   */
  static async autoMigrateUserDecks(userId) {
    try {
      // Check user's migration status
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};

      // Skip if already migrated
      if (userData.deckMigrationCompleted) {
        return { success: true, message: 'Already migrated' };
      }

      // Skip if failed recently (within 24 hours)
      if (userData.deckMigrationFailed && userData.deckMigrationAttemptDate) {
        const attemptDate = userData.deckMigrationAttemptDate.toMillis();
        const hoursSinceAttempt = (Date.now() - attemptDate) / (1000 * 60 * 60);
        
        if (hoursSinceAttempt < 24) {
          return { success: false, message: 'Migration failed recently, will retry later' };
        }
      }

      // Perform auto-migration
      return await this.migrateUserToDecks(userId);
    } catch (error) {
      console.error('Error in auto-migration:', error);
      return { success: false, message: 'Auto-migration failed', error };
    }
  }
}
