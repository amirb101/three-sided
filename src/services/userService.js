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

export class UserService {
  // Get user profile
  static async getUserProfile(userId) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
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

      // Get user's flashcards count
      const flashcardsQuery = query(
        collection(db, 'flashcards'),
        where('authorId', '==', userId)
      );
      const flashcardsSnapshot = await getDocs(flashcardsQuery);
      const flashcardCount = flashcardsSnapshot.size;

      // Simulate some achievements based on activity
      const achievements = [];
      if (flashcardCount > 0) achievements.push('first_card');
      if (flashcardCount >= 10) achievements.push('ten_cards');
      if (flashcardCount >= 100) achievements.push('hundred_cards');
      if (profile.upvotes > 50) achievements.push('popular_creator');

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
      // For now, we'll simulate study history
      // In production, you'd have a separate study_sessions collection
      const mockHistory = [
        {
          date: '2024-01-15',
          duration: 45,
          cardsStudied: 12,
          accuracy: 85
        },
        {
          date: '2024-01-14',
          duration: 30,
          cardsStudied: 8,
          accuracy: 92
        },
        {
          date: '2024-01-13',
          duration: 60,
          cardsStudied: 20,
          accuracy: 78
        },
        {
          date: '2024-01-12',
          duration: 25,
          cardsStudied: 6,
          accuracy: 95
        },
        {
          date: '2024-01-11',
          duration: 40,
          cardsStudied: 15,
          accuracy: 88
        }
      ];

      return mockHistory;
    } catch (error) {
      console.error('Error fetching study history:', error);
      return [];
    }
  }
}
