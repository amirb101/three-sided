import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { DeckService } from './deckService';

export class FlashcardService {
  // Get flashcards for a user (from private cards collection)
  static async getUserFlashcards(userId, resultLimit = 50) {
    try {
      const q = query(
        collection(db, 'cards'),
        where('userId', '==', userId),
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
        collection(db, 'publicCards'),
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

  // Get public flashcards by a specific user
  static async getPublicFlashcardsByUser(userId, resultLimit = 50) {
    try {
      const q = query(
        collection(db, 'publicCards'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(resultLimit)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user public flashcards:', error);
      throw error;
    }
  }

  // Create a new flashcard (private first, then optionally make public)
  static async createFlashcard(flashcardData, userId, deckId = null) {
    try {
      console.log('🎯 Creating flashcard for user:', userId, 'with data:', flashcardData);
      
      // Validate user ID
      if (!userId || typeof userId !== 'string') {
        throw new Error('Valid user ID is required to create flashcard');
      }
      
      // Get default deck (always needed for master collection)
      const defaultDeck = await DeckService.getOrCreateDefaultDeck(userId);
      console.log('📚 Default deck obtained:', defaultDeck.id);
      const targetDeckId = deckId || defaultDeck.id;
      
      // Build deckIds array - always include default deck
      const deckIds = deckId && deckId !== defaultDeck.id 
        ? [defaultDeck.id, targetDeckId] // Both default and specified deck
        : [defaultDeck.id]; // Just default deck
      
      // Prepare card data with proper validation
      const cardDoc = {
        statement: flashcardData.statement || flashcardData.question || '',
        hints: flashcardData.hints || flashcardData.answer || '',
        proof: flashcardData.proof || '',
        tags: Array.isArray(flashcardData.tags) ? flashcardData.tags : 
              (typeof flashcardData.tags === 'string' ? flashcardData.tags.split(',').map(t => t.trim()).filter(t => t) : []),
        subject: flashcardData.subject || '',
        userId: userId,
        createdAt: serverTimestamp(),
        isPublic: flashcardData.isPublic || false,
        // Deck associations - always include default deck
        defaultDeckId: defaultDeck.id,
        deckIds: deckIds
      };
      
      console.log('💾 Creating card document:', cardDoc);
      
      // Create card in cards collection with correct privacy setting
      const cardRef = await addDoc(collection(db, 'cards'), cardDoc);

      // If marked as public, also add to publicCards collection
      if (flashcardData.isPublic) {
        // Check for user profile in both old and new systems (backwards compatible)
        let userSlug = null;
        
        // First, try the old system (userToSlug collection)
        const userSlugDoc = await getDoc(doc(db, 'userToSlug', userId));
        if (userSlugDoc.exists()) {
          userSlug = userSlugDoc.data().slug;
        } else {
          // Fallback to new system (users collection)
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists() && userDoc.data().username) {
            userSlug = userDoc.data().username;
          } else {
            throw new Error('You must create a profile before posting public cards. Please create your profile first.');
          }
        }
        
        // Generate unique slug like the old system
        const baseSlug = (flashcardData.question || flashcardData.statement)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 50);
        
        const uniqueSlug = await this.ensureUniqueCardSlug(baseSlug);

        // Use setDoc with slug as document ID (like old system)
        await setDoc(doc(db, 'publicCards', uniqueSlug), {
          statement: flashcardData.question || flashcardData.statement,
          hints: flashcardData.hints || flashcardData.answer,
          proof: flashcardData.proof || flashcardData.answer,
          tags: flashcardData.tags || [],
          userId: userId,
          authorSlug: userSlug, // Use actual user profile slug
          slug: uniqueSlug,
          id: uniqueSlug, // Also store as id field for consistency
          createdAt: serverTimestamp(),
          likeCount: 0,
          viewCount: 0,
          importCount: 0
        });
      }
      
      // Add card to all specified decks
      for (const deckIdToAdd of deckIds) {
        await DeckService.addCardToDeck(deckIdToAdd, cardRef.id);
      }
      
      return cardRef.id;
    } catch (error) {
      console.error('Error creating flashcard:', error);
      throw error;
    }
  }

  // Update card deck associations
  static async updateCardDeck(cardId, newDeckId) {
    try {
      const cardRef = doc(db, 'cards', cardId);
      const cardDoc = await getDoc(cardRef);
      
      if (!cardDoc.exists()) {
        throw new Error('Card not found');
      }
      
      const cardData = cardDoc.data();
      const currentDeckIds = cardData.deckIds || [];
      
      // Add new deck if not already present
      if (!currentDeckIds.includes(newDeckId)) {
        const updatedDeckIds = [...currentDeckIds, newDeckId];
        await updateDoc(cardRef, {
          deckIds: updatedDeckIds
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating card deck:', error);
      throw error;
    }
  }

  // Ensure unique card slug (matches old system logic)
  static async ensureUniqueCardSlug(baseSlug) {
    let slug = baseSlug;
    let tries = 0;
    
    while (tries < 5) {
      // Check if document with this slug ID exists (like old system)
      const docRef = doc(db, 'publicCards', slug);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return slug; // Slug is unique
      }
      
      // Generate new slug with random suffix
      slug = baseSlug + '-' + Math.floor(Math.random() * 10000);
      tries++;
    }
    
    throw new Error('Failed to generate unique card slug after multiple attempts.');
  }

  // Update a flashcard
  static async updateFlashcard(flashcardId, updates) {
    try {
      const docRef = doc(db, 'cards', flashcardId);
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
      const docRef = doc(db, 'cards', flashcardId);
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

  // ==========================================
  // DECK-RELATED FLASHCARD OPERATIONS
  // ==========================================

  /**
   * Get flashcards for a specific deck
   */
  static async getDeckFlashcards(deckId, resultLimit = 100) {
    try {
      return await DeckService.getDeckCards(deckId, resultLimit);
    } catch (error) {
      console.error('Error fetching deck flashcards:', error);
      throw error;
    }
  }

  /**
   * Move a card from one deck to another
   */
  static async moveCardToDeck(cardId, fromDeckId, toDeckId) {
    try {
      // Remove from old deck
      if (fromDeckId) {
        await DeckService.removeCardFromDeck(fromDeckId, cardId);
      }
      
      // Add to new deck
      await DeckService.addCardToDeck(toDeckId, cardId);
      
      // Update card's deck associations
      await updateDoc(doc(db, 'cards', cardId), {
        defaultDeckId: toDeckId,
        deckIds: arrayUnion(toDeckId)
      });
      
      // Remove old deck from deckIds if provided
      if (fromDeckId) {
        await updateDoc(doc(db, 'cards', cardId), {
          deckIds: arrayRemove(fromDeckId)
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error moving card to deck:', error);
      throw error;
    }
  }

  /**
   * Get user flashcards organized by deck
   */
  static async getUserFlashcardsByDeck(userId) {
    try {
      // Get all user decks
      const userDecks = await DeckService.getUserDecks(userId);
      
      // Get cards for each deck
      const deckCards = {};
      for (const deck of userDecks) {
        deckCards[deck.id] = {
          deck: deck,
          cards: await this.getDeckFlashcards(deck.id)
        };
      }
      
      return deckCards;
    } catch (error) {
      console.error('Error fetching user flashcards by deck:', error);
      throw error;
    }
  }

  /**
   * Create flashcard and add to specific deck
   */
  static async createFlashcardInDeck(flashcardData, userId, deckId) {
    try {
      return await this.createFlashcard(flashcardData, userId, deckId);
    } catch (error) {
      console.error('Error creating flashcard in deck:', error);
      throw error;
    }
  }

  /**
   * Get all flashcards from multiple decks
   */
  static async getFlashcardsFromDecks(deckIds, resultLimit = 200) {
    try {
      const allCards = [];
      
      for (const deckId of deckIds) {
        const deckCards = await this.getDeckFlashcards(deckId, resultLimit);
        allCards.push(...deckCards);
      }
      
      // Remove duplicates and sort by creation date
      const uniqueCards = allCards.reduce((acc, card) => {
        if (!acc.find(c => c.id === card.id)) {
          acc.push(card);
        }
        return acc;
      }, []);
      
      return uniqueCards.sort((a, b) => {
        const aDate = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
        const bDate = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
        return bDate - aDate;
      });
    } catch (error) {
      console.error('Error fetching flashcards from multiple decks:', error);
      throw error;
    }
  }

  // ==========================================
  // PUBLIC FLASHCARD MANAGEMENT
  // ==========================================

  // Get a single public flashcard
  static async getPublicFlashcard(cardId) {
    try {
      const docSnap = await getDoc(doc(db, 'publicCards', cardId));
      if (!docSnap.exists()) {
        throw new Error('Public flashcard not found');
      }
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } catch (error) {
      console.error('Error fetching public flashcard:', error);
      throw error;
    }
  }

  // Update a public flashcard (only by owner)
  static async updatePublicFlashcard(cardId, updateData, userId) {
    try {
      // First verify ownership
      const cardSnap = await getDoc(doc(db, 'publicCards', cardId));
      if (!cardSnap.exists()) {
        throw new Error('Public flashcard not found');
      }

      const cardData = cardSnap.data();
      if (cardData.userId !== userId) {
        throw new Error('You can only edit your own public flashcards');
      }

      // Update the public card
      const publicCardRef = doc(db, 'publicCards', cardId);
      await updateDoc(publicCardRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating public flashcard:', error);
      throw error;
    }
  }

  // Delete a public flashcard (only by owner)
  static async deletePublicFlashcard(cardId, userId) {
    try {
      // First verify ownership
      const cardSnap = await getDoc(doc(db, 'publicCards', cardId));
      if (!cardSnap.exists()) {
        throw new Error('Public flashcard not found');
      }

      const cardData = cardSnap.data();
      if (cardData.userId !== userId) {
        throw new Error('You can only delete your own public flashcards');
      }

      // Delete the public card
      await deleteDoc(doc(db, 'publicCards', cardId));

      return { success: true };
    } catch (error) {
      console.error('Error deleting public flashcard:', error);
      throw error;
    }
  }

  // Toggle public status of a flashcard
  static async toggleFlashcardPublic(cardId, userId, makePublic = true) {
    try {
      if (makePublic) {
        // Make card public
        await this.makeFlashcardPublic(cardId, userId);
      } else {
        // Make card private (remove from public collection)
        await this.makeFlashcardPrivate(cardId, userId);
      }
      return { success: true };
    } catch (error) {
      console.error('Error toggling flashcard public status:', error);
      throw error;
    }
  }

  // Make a private flashcard public
  static async makeFlashcardPublic(cardId, userId) {
    try {
      // Get the private card
      const privateCard = await this.getFlashcard(cardId, userId);
      
      // Check if user has a profile (required for public cards)
      const profileSnap = await getDoc(doc(db, 'userToSlug', userId));
      if (!profileSnap.exists()) {
        throw new Error('You must create a profile before making cards public');
      }

      const authorSlug = profileSnap.data().slug;

      // Generate unique slug for the public card
      const baseSlug = this.generateSlugFromStatement(privateCard.statement);
      const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

      // Create public version
      const publicCardData = {
        statement: privateCard.statement,
        hints: privateCard.hints,
        proof: privateCard.proof,
        subject: privateCard.subject,
        tags: privateCard.tags || [],
        userId: userId,
        authorSlug: authorSlug,
        slug: uniqueSlug,
        createdAt: privateCard.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        likeCount: 0,
        viewCount: 0,
        importCount: 0
      };

      await setDoc(doc(db, 'publicCards', uniqueSlug), publicCardData);

      // Update private card to reference public version
      await updateDoc(doc(db, 'cards', cardId), {
        isPublic: true,
        publicSlug: uniqueSlug,
        updatedAt: serverTimestamp()
      });

      return { 
        success: true, 
        publicSlug: uniqueSlug,
        publicUrl: `/card/${uniqueSlug}`
      };
    } catch (error) {
      console.error('Error making flashcard public:', error);
      throw error;
    }
  }

  // Make a public flashcard private
  static async makeFlashcardPrivate(cardId, userId) {
    try {
      // Get the private card to find its public slug
      const privateCardSnap = await getDoc(doc(db, 'cards', cardId));
      if (!privateCardSnap.exists()) {
        throw new Error('Private flashcard not found');
      }

      const privateCard = privateCardSnap.data();
      if (privateCard.userId !== userId) {
        throw new Error('You can only modify your own flashcards');
      }

      // Delete public version if it exists
      if (privateCard.publicSlug) {
        await deleteDoc(doc(db, 'publicCards', privateCard.publicSlug));
      }

      // Update private card
      await updateDoc(doc(db, 'cards', cardId), {
        isPublic: false,
        publicSlug: null,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error making flashcard private:', error);
      throw error;
    }
  }

  // Import a public flashcard to user's private collection
  static async importPublicFlashcard(publicCardId, userId) {
    try {
      // Get the public card
      const publicCard = await this.getPublicFlashcard(publicCardId);

      // Create private copy
      const privateCardData = {
        statement: publicCard.statement,
        hints: publicCard.hints,
        proof: publicCard.proof,
        subject: publicCard.subject,
        tags: publicCard.tags || [],
        userId: userId,
        createdAt: serverTimestamp(),
        isPublic: false,
        originalCardId: publicCardId,
        originalAuthor: publicCard.userId,
        importedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'cards'), privateCardData);

      // Increment import count on public card
      await updateDoc(doc(db, 'publicCards', publicCardId), {
        importCount: increment(1)
      });

      return { 
        success: true, 
        cardId: docRef.id 
      };
    } catch (error) {
      console.error('Error importing public flashcard:', error);
      throw error;
    }
  }

  // Generate URL-friendly slug from statement
  static generateSlugFromStatement(statement) {
    return statement
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .slice(0, 50); // Limit length
  }

  // Ensure slug is unique by checking existing public cards
  static async ensureUniqueSlug(baseSlug) {
    let slug = baseSlug;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existingCard = await getDoc(doc(db, 'publicCards', slug));
      if (!existingCard.exists()) {
        return slug;
      }
      
      attempts++;
      slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
    }

    throw new Error('Failed to generate unique slug after multiple attempts');
  }
}
