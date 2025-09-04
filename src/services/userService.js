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
  limit
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

      return {
        ...profile,
        flashcardCount,
        // Add more stats as needed
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
}
