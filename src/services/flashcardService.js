import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export class FlashcardService {
  // Get flashcards for a user
  static async getUserFlashcards(userId, limit = 50) {
    try {
      const q = query(
        collection(db, 'flashcards'),
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user flashcards:', error);
      throw error;
    }
  }

  // Get public flashcards
  static async getPublicFlashcards(limit = 50) {
    try {
      const q = query(
        collection(db, 'flashcards'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching public flashcards:', error);
      throw error;
    }
  }

  // Create a new flashcard
  static async createFlashcard(flashcardData, userId) {
    try {
      const docRef = await addDoc(collection(db, 'flashcards'), {
        ...flashcardData,
        authorId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
        isPublic: true
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating flashcard:', error);
      throw error;
    }
  }

  // Update a flashcard
  static async updateFlashcard(flashcardId, updates) {
    try {
      const docRef = doc(db, 'flashcards', flashcardId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating flashcard:', error);
      throw error;
    }
  }

  // Search flashcards
  static async searchFlashcards(searchTerm, limit = 20) {
    try {
      // For now, we'll get all public cards and filter client-side
      // In production, you'd want to use Algolia or similar for better search
      const cards = await this.getPublicFlashcards(100);
      
      return cards.filter(card => 
        card.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.answer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.hints?.some(hint => 
          hint.toLowerCase().includes(searchTerm.toLowerCase())
        )
      ).slice(0, limit);
    } catch (error) {
      console.error('Error searching flashcards:', error);
      throw error;
    }
  }
}
