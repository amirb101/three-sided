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
  serverTimestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';

export class FlashcardService {
  // Get flashcards for a user
  static async getUserFlashcards(userId, resultLimit = 50) {
    try {
      const q = query(
        collection(db, 'flashcards'),
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(resultLimit)
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
  static async getPublicFlashcards(resultLimit = 50) {
    try {
      const q = query(
        collection(db, 'flashcards'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(resultLimit)
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

  // Delete a flashcard
  static async deleteFlashcard(flashcardId) {
    try {
      const docRef = doc(db, 'flashcards', flashcardId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      throw error;
    }
  }

  // Search flashcards with filters (server-side where possible)
  static async searchFlashcards(searchTerm, filters = {}, resultLimit = 20) {
    try {
      // Build a Firestore query for public cards with optional subject and sorting
      const clauses = [where('isPublic', '==', true)];
      if (filters.subject) {
        clauses.push(where('subject', '==', filters.subject));
      }

      let orderField = 'createdAt';
      let orderDirection = 'desc';
      if (filters.sortBy === 'oldest') {
        orderField = 'createdAt';
        orderDirection = 'asc';
      } else if (filters.sortBy === 'popular') {
        orderField = 'upvotes';
        orderDirection = 'desc';
      }

      const q = query(
        collection(db, 'flashcards'),
        ...clauses,
        orderBy(orderField, orderDirection),
        limit(resultLimit * 3) // fetch extra to allow client-side text filtering
      );

      const snapshot = await getDocs(q);
      let cards = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Basic text search fallback client-side
      if (searchTerm && searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        cards = cards.filter(card => (
          card.question?.toLowerCase().includes(s) ||
          card.answer?.toLowerCase().includes(s) ||
          (Array.isArray(card.hints) && card.hints.some(h => h.toLowerCase().includes(s))) ||
          (Array.isArray(card.tags) && card.tags.some(t => t.toLowerCase().includes(s)))
        ));
      }

      return cards.slice(0, resultLimit);
    } catch (error) {
      console.error('Error searching flashcards:', error);
      // fallback to previous public fetch
      const fallback = await this.getPublicFlashcards(resultLimit);
      return fallback;
    }
  }

  // Get all unique subjects
  static async getSubjects() {
    try {
      const cards = await this.getPublicFlashcards(1000);
      const subjects = new Set();
      
      cards.forEach(card => {
        if (card.subject) {
          subjects.add(card.subject);
        }
      });
      
      return Array.from(subjects).sort();
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'];
    }
  }

  // Get popular tags
  static async getPopularTags(limit = 20) {
    try {
      const cards = await this.getPublicFlashcards(1000);
      const tagCounts = {};
      
      cards.forEach(card => {
        if (card.tags) {
          card.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      
      return Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([tag]) => tag);
    } catch (error) {
      console.error('Error fetching popular tags:', error);
      return ['calculus', 'algebra', 'geometry', 'trigonometry', 'statistics'];
    }
  }

  // Get user favorites
  static async getUserFavorites(userId) {
    try {
      // For now, we'll simulate favorites by getting some public cards
      // In production, you'd have a separate favorites collection
      const cards = await this.getPublicFlashcards(20);
      return cards.slice(0, 10); // Return first 10 as "favorites"
    } catch (error) {
      console.error('Error fetching user favorites:', error);
      return [];
    }
  }

  // Remove from favorites
  static async removeFromFavorites(userId, cardId) {
    try {
      // In production, you'd remove from a favorites collection
      // For now, just return success
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  }
}
