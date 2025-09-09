import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';

export class DeckService {
  // ==========================================
  // CORE DECK CRUD OPERATIONS
  // ==========================================

  /**
   * Create a new deck
   */
  static async createDeck(userId, deckData) {
    try {
      const deckRef = await addDoc(collection(db, 'decks'), {
        name: deckData.name || 'Untitled Deck',
        description: deckData.description || '',
        userId: userId,
        isPublic: deckData.isPublic || false,
        isDefault: deckData.isDefault || false,
        subject: deckData.subject || '',
        difficulty: deckData.difficulty || 'beginner',
        tags: deckData.tags || [],
        cardCount: 0,
        color: deckData.color || '#635BFF',
        icon: deckData.icon || '📚',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Public deck fields
        authorSlug: deckData.authorSlug || null,
        slug: deckData.slug || null,
        likeCount: 0,
        importCount: 0,
        viewCount: 0,
        
        // Learning analytics
        studyStreak: 0,
        lastStudied: null,
        averageScore: 0
      });

      // If public, also add to publicDecks collection
      if (deckData.isPublic && deckData.slug && deckData.authorSlug) {
        await addDoc(collection(db, 'publicDecks'), {
          deckId: deckRef.id,
          name: deckData.name,
          description: deckData.description,
          authorSlug: deckData.authorSlug,
          slug: deckData.slug,
          subject: deckData.subject || '',
          difficulty: deckData.difficulty || 'beginner',
          tags: deckData.tags || [],
          cardCount: 0,
          likeCount: 0,
          importCount: 0,
          createdAt: serverTimestamp()
        });
      }

      return deckRef.id;
    } catch (error) {
      console.error('Error creating deck:', error);
      throw error;
    }
  }

  /**
   * Get all decks for a user
   */
  static async getUserDecks(userId, includeDefault = true) {
    try {
      let q = query(
        collection(db, 'decks'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      if (!includeDefault) {
        q = query(
          collection(db, 'decks'),
          where('userId', '==', userId),
          where('isDefault', '==', false),
          orderBy('updatedAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user decks:', error);
      throw error;
    }
  }

  /**
   * Get a specific deck by ID
   */
  static async getDeck(deckId) {
    try {
      const deckDoc = await getDoc(doc(db, 'decks', deckId));
      if (!deckDoc.exists()) {
        throw new Error('Deck not found');
      }
      return { id: deckDoc.id, ...deckDoc.data() };
    } catch (error) {
      console.error('Error fetching deck:', error);
      throw error;
    }
  }

  /**
   * Update deck information
   */
  static async updateDeck(deckId, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'decks', deckId), updateData);

      // If updating a public deck, also update publicDecks collection
      const deck = await this.getDeck(deckId);
      if (deck.isPublic && deck.slug) {
        const publicDeckQuery = query(
          collection(db, 'publicDecks'),
          where('deckId', '==', deckId),
          limit(1)
        );
        const publicDeckSnap = await getDocs(publicDeckQuery);
        
        if (!publicDeckSnap.empty) {
          const publicDeckDoc = publicDeckSnap.docs[0];
          await updateDoc(doc(db, 'publicDecks', publicDeckDoc.id), {
            name: updates.name || deck.name,
            description: updates.description || deck.description,
            subject: updates.subject || deck.subject,
            difficulty: updates.difficulty || deck.difficulty,
            tags: updates.tags || deck.tags
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating deck:', error);
      throw error;
    }
  }

  /**
   * Delete a deck and all its card associations
   */
  static async deleteDeck(deckId) {
    try {
      const batch = writeBatch(db);

      // Get all cards in this deck
      const deckCardsQuery = query(
        collection(db, 'deckCards'),
        where('deckId', '==', deckId)
      );
      const deckCardsSnap = await getDocs(deckCardsQuery);

      // Remove deck associations from cards
      for (const deckCardDoc of deckCardsSnap.docs) {
        batch.delete(doc(db, 'deckCards', deckCardDoc.id));
        
        // Update card's deckIds array
        const cardId = deckCardDoc.data().cardId;
        const cardRef = doc(db, 'cards', cardId);
        batch.update(cardRef, {
          deckIds: arrayRemove(deckId)
        });
      }

      // Delete the deck itself
      batch.delete(doc(db, 'decks', deckId));

      // If public deck, remove from publicDecks
      const publicDeckQuery = query(
        collection(db, 'publicDecks'),
        where('deckId', '==', deckId)
      );
      const publicDeckSnap = await getDocs(publicDeckQuery);
      
      for (const publicDeckDoc of publicDeckSnap.docs) {
        batch.delete(doc(db, 'publicDecks', publicDeckDoc.id));
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error deleting deck:', error);
      throw error;
    }
  }

  // ==========================================
  // CARD MANAGEMENT OPERATIONS
  // ==========================================

  /**
   * Add a card to a deck
   */
  static async addCardToDeck(deckId, cardId, position = null) {
    try {
      return await runTransaction(db, async (transaction) => {
        // Get current deck info
        const deckRef = doc(db, 'decks', deckId);
        const deckDoc = await transaction.get(deckRef);
        
        if (!deckDoc.exists()) {
          throw new Error('Deck not found');
        }

        const currentCardCount = deckDoc.data().cardCount || 0;
        const newPosition = position !== null ? position : currentCardCount + 1;

        // Add to deckCards junction table
        const deckCardRef = doc(collection(db, 'deckCards'));
        transaction.set(deckCardRef, {
          deckId: deckId,
          cardId: cardId,
          position: newPosition,
          addedAt: serverTimestamp(),
          addedBy: deckDoc.data().userId
        });

        // Update card's deckIds array
        const cardRef = doc(db, 'cards', cardId);
        transaction.update(cardRef, {
          deckIds: arrayUnion(deckId)
        });

        // Update deck's card count
        transaction.update(deckRef, {
          cardCount: currentCardCount + 1,
          updatedAt: serverTimestamp()
        });

        return deckCardRef.id;
      });
    } catch (error) {
      console.error('Error adding card to deck:', error);
      throw error;
    }
  }

  /**
   * Remove a card from a deck
   */
  static async removeCardFromDeck(deckId, cardId) {
    try {
      return await runTransaction(db, async (transaction) => {
        // Find the deckCard association
        const deckCardsQuery = query(
          collection(db, 'deckCards'),
          where('deckId', '==', deckId),
          where('cardId', '==', cardId),
          limit(1)
        );
        const deckCardsSnap = await getDocs(deckCardsQuery);

        if (deckCardsSnap.empty) {
          throw new Error('Card not found in deck');
        }

        const deckCardDoc = deckCardsSnap.docs[0];
        
        // Remove from deckCards junction table
        transaction.delete(doc(db, 'deckCards', deckCardDoc.id));

        // Update card's deckIds array
        const cardRef = doc(db, 'cards', cardId);
        transaction.update(cardRef, {
          deckIds: arrayRemove(deckId)
        });

        // Update deck's card count
        const deckRef = doc(db, 'decks', deckId);
        const deckDoc = await transaction.get(deckRef);
        const currentCardCount = deckDoc.data().cardCount || 0;
        
        transaction.update(deckRef, {
          cardCount: Math.max(0, currentCardCount - 1),
          updatedAt: serverTimestamp()
        });

        return true;
      });
    } catch (error) {
      console.error('Error removing card from deck:', error);
      throw error;
    }
  }

  /**
   * Get all cards in a deck with their positions
   */
  static async getDeckCards(deckId, resultLimit = 100) {
    try {
      const q = query(
        collection(db, 'deckCards'),
        where('deckId', '==', deckId),
        orderBy('position', 'asc'),
        limit(resultLimit)
      );

      const deckCardsSnap = await getDocs(q);
      const cardIds = deckCardsSnap.docs.map(doc => doc.data().cardId);

      if (cardIds.length === 0) {
        return [];
      }

      // Get card details
      const cards = [];
      for (const cardId of cardIds) {
        try {
          const cardDoc = await getDoc(doc(db, 'cards', cardId));
          if (cardDoc.exists()) {
            cards.push({ id: cardDoc.id, ...cardDoc.data() });
          }
        } catch (error) {
          console.warn(`Failed to fetch card ${cardId}:`, error);
        }
      }

      return cards;
    } catch (error) {
      console.error('Error fetching deck cards:', error);
      throw error;
    }
  }

  /**
   * Reorder cards within a deck
   */
  static async reorderCardsInDeck(deckId, cardOrders) {
    try {
      const batch = writeBatch(db);

      for (const { cardId, position } of cardOrders) {
        const deckCardsQuery = query(
          collection(db, 'deckCards'),
          where('deckId', '==', deckId),
          where('cardId', '==', cardId),
          limit(1)
        );
        const deckCardsSnap = await getDocs(deckCardsQuery);

        if (!deckCardsSnap.empty) {
          const deckCardDoc = deckCardsSnap.docs[0];
          batch.update(doc(db, 'deckCards', deckCardDoc.id), { position });
        }
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error reordering deck cards:', error);
      throw error;
    }
  }

  // ==========================================
  // DEFAULT DECK MANAGEMENT
  // ==========================================

  /**
   * Create default deck for a user
   */
  static async createDefaultDeck(userId) {
    try {
      const defaultDeckData = {
        name: 'My Flashcards',
        description: 'Your complete collection - contains all your flashcards',
        isDefault: true,
        isPublic: false,
        subject: '',
        difficulty: 'mixed',
        tags: [],
        color: '#635BFF',
        icon: '📚'
      };

      const deckId = await this.createDeck(userId, defaultDeckData);
      return { id: deckId, ...defaultDeckData };
    } catch (error) {
      console.error('Error creating default deck:', error);
      throw error;
    }
  }

  /**
   * Get or create default deck for user
   */
  static async getOrCreateDefaultDeck(userId) {
    try {
      // Check if default deck exists
      const q = query(
        collection(db, 'decks'),
        where('userId', '==', userId),
        where('isDefault', '==', true),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }

      // Create default deck if it doesn't exist
      return await this.createDefaultDeck(userId);
    } catch (error) {
      console.error('Error getting or creating default deck:', error);
      throw error;
    }
  }

  /**
   * Migrate all user's existing cards to their default deck
   */
  static async migrateCardsToDefaultDeck(userId) {
    try {
      console.log(`🔄 Starting deck migration for user: ${userId}`);
      
      // Get or create default deck
      const defaultDeck = await this.getOrCreateDefaultDeck(userId);
      console.log(`📚 Default deck: ${defaultDeck.name} (${defaultDeck.id})`);

      // Get all user cards from both collections
      const [newCards, legacyCards] = await Promise.all([
        this.getUserCardsFromCollection('cards', userId),
        this.getUserCardsFromCollection('flashcards', userId)
      ]);

      const allCards = [...newCards, ...legacyCards];
      console.log(`🃏 Found ${allCards.length} cards to migrate`);

      if (allCards.length === 0) {
        console.log('✅ No cards to migrate');
        return { migratedCount: 0, defaultDeck };
      }

      let migratedCount = 0;
      const batch = writeBatch(db);

      for (const card of allCards) {
        try {
          // ALWAYS add card to default deck (master collection approach)
          const deckCardRef = doc(collection(db, 'deckCards'));
          batch.set(deckCardRef, {
            deckId: defaultDeck.id,
            cardId: card.id,
            position: migratedCount + 1,
            addedAt: serverTimestamp(),
            addedBy: userId
          });

          // Update card with deck association - always include default deck
          const cardRef = doc(db, card.collection, card.id);
          const existingDeckIds = card.deckIds || [];
          const updatedDeckIds = existingDeckIds.includes(defaultDeck.id) 
            ? existingDeckIds 
            : [...existingDeckIds, defaultDeck.id];
          
          batch.update(cardRef, {
            deckIds: updatedDeckIds,
            defaultDeckId: defaultDeck.id
          });

          migratedCount++;
        } catch (error) {
          console.warn(`Failed to migrate card ${card.id}:`, error);
        }
      }

      // Update default deck card count
      if (migratedCount > 0) {
        const deckRef = doc(db, 'decks', defaultDeck.id);
        batch.update(deckRef, {
          cardCount: migratedCount,
          updatedAt: serverTimestamp()
        });

        await batch.commit();
      }

      console.log(`✅ Migration complete: ${migratedCount} cards migrated`);
      return { migratedCount, defaultDeck };
    } catch (error) {
      console.error('Error migrating cards to default deck:', error);
      throw error;
    }
  }

  /**
   * Helper method to get user cards from a specific collection
   */
  static async getUserCardsFromCollection(collectionName, userId) {
    try {
      const q = query(
        collection(db, collectionName),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        collection: collectionName,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error fetching cards from ${collectionName}:`, error);
      return [];
    }
  }

  // ==========================================
  // PUBLIC DECK OPERATIONS
  // ==========================================

  /**
   * Make a deck public
   */
  static async makeDeckPublic(deckId, authorSlug, slug) {
    try {
      return await runTransaction(db, async (transaction) => {
        const deckRef = doc(db, 'decks', deckId);
        const deckDoc = await transaction.get(deckRef);

        if (!deckDoc.exists()) {
          throw new Error('Deck not found');
        }

        const deckData = deckDoc.data();

        // Update deck to public
        transaction.update(deckRef, {
          isPublic: true,
          authorSlug: authorSlug,
          slug: slug,
          updatedAt: serverTimestamp()
        });

        // Add to publicDecks collection
        const publicDeckRef = doc(collection(db, 'publicDecks'));
        transaction.set(publicDeckRef, {
          deckId: deckId,
          name: deckData.name,
          description: deckData.description,
          authorSlug: authorSlug,
          slug: slug,
          subject: deckData.subject || '',
          difficulty: deckData.difficulty || 'beginner',
          tags: deckData.tags || [],
          cardCount: deckData.cardCount || 0,
          likeCount: 0,
          importCount: 0,
          createdAt: deckData.createdAt
        });

        return true;
      });
    } catch (error) {
      console.error('Error making deck public:', error);
      throw error;
    }
  }

  /**
   * Get public decks with filtering
   */
  static async getPublicDecks(filters = {}, resultLimit = 50) {
    try {
      let q = query(collection(db, 'publicDecks'));

      // Apply filters
      if (filters.subject) {
        q = query(q, where('subject', '==', filters.subject));
      }
      if (filters.difficulty) {
        q = query(q, where('difficulty', '==', filters.difficulty));
      }
      if (filters.tag) {
        q = query(q, where('tags', 'array-contains', filters.tag));
      }

      // Apply sorting
      if (filters.sortBy === 'popular') {
        q = query(q, orderBy('likeCount', 'desc'), orderBy('createdAt', 'desc'));
      } else if (filters.sortBy === 'imported') {
        q = query(q, orderBy('importCount', 'desc'), orderBy('createdAt', 'desc'));
      } else {
        q = query(q, orderBy('createdAt', 'desc'));
      }

      q = query(q, limit(resultLimit));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching public decks:', error);
      throw error;
    }
  }

  /**
   * Import a public deck for a user
   */
  static async importPublicDeck(deckId, userId) {
    try {
      return await runTransaction(db, async (transaction) => {
        // Get the source deck
        const sourceDeckRef = doc(db, 'decks', deckId);
        const sourceDeckDoc = await transaction.get(sourceDeckRef);

        if (!sourceDeckDoc.exists()) {
          throw new Error('Source deck not found');
        }

        const sourceDeckData = sourceDeckDoc.data();

        // Create new deck for user
        const newDeckRef = doc(collection(db, 'decks'));
        transaction.set(newDeckRef, {
          ...sourceDeckData,
          userId: userId,
          isPublic: false,
          isDefault: false,
          name: `${sourceDeckData.name} (Imported)`,
          authorSlug: null,
          slug: null,
          likeCount: 0,
          importCount: 0,
          viewCount: 0,
          studyStreak: 0,
          lastStudied: null,
          averageScore: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Get cards from source deck
        const sourceDeckCardsQuery = query(
          collection(db, 'deckCards'),
          where('deckId', '==', deckId)
        );
        const sourceDeckCardsSnap = await getDocs(sourceDeckCardsQuery);

        // Copy cards to new deck
        for (const deckCardDoc of sourceDeckCardsSnap.docs) {
          const deckCardData = deckCardDoc.data();
          
          // Copy the actual card
          const sourceCardRef = doc(db, 'cards', deckCardData.cardId);
          const sourceCardDoc = await transaction.get(sourceCardRef);
          
          if (sourceCardDoc.exists()) {
            const sourceCardData = sourceCardDoc.data();
            
            // Create new card for user
            const newCardRef = doc(collection(db, 'cards'));
            transaction.set(newCardRef, {
              ...sourceCardData,
              userId: userId,
              isPublic: false,
              deckIds: [newDeckRef.id],
              defaultDeckId: newDeckRef.id,
              createdAt: serverTimestamp(),
              originalCardId: deckCardData.cardId // Track import source
            });

            // Add to new deck's deckCards
            const newDeckCardRef = doc(collection(db, 'deckCards'));
            transaction.set(newDeckCardRef, {
              deckId: newDeckRef.id,
              cardId: newCardRef.id,
              position: deckCardData.position,
              addedAt: serverTimestamp(),
              addedBy: userId
            });
          }
        }

        // Update import count on public deck
        const publicDeckQuery = query(
          collection(db, 'publicDecks'),
          where('deckId', '==', deckId),
          limit(1)
        );
        const publicDeckSnap = await getDocs(publicDeckQuery);
        
        if (!publicDeckSnap.empty) {
          const publicDeckDoc = publicDeckSnap.docs[0];
          transaction.update(doc(db, 'publicDecks', publicDeckDoc.id), {
            importCount: (publicDeckDoc.data().importCount || 0) + 1
          });
        }

        return newDeckRef.id;
      });
    } catch (error) {
      console.error('Error importing public deck:', error);
      throw error;
    }
  }

  // ==========================================
  // ANALYTICS AND UTILITIES
  // ==========================================

  /**
   * Update deck study statistics
   */
  static async updateDeckStats(deckId, statUpdates) {
    try {
      const deckRef = doc(db, 'decks', deckId);
      await updateDoc(deckRef, {
        ...statUpdates,
        lastStudied: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating deck stats:', error);
      throw error;
    }
  }

  /**
   * Get deck analytics
   */
  static async getDeckAnalytics(deckId) {
    try {
      const deck = await this.getDeck(deckId);
      const cards = await this.getDeckCards(deckId);

      return {
        cardCount: cards.length,
        studyStreak: deck.studyStreak || 0,
        averageScore: deck.averageScore || 0,
        lastStudied: deck.lastStudied,
        createdAt: deck.createdAt,
        subjects: [...new Set(cards.map(c => c.subject).filter(Boolean))],
        tags: [...new Set(cards.flatMap(c => c.tags || []))]
      };
    } catch (error) {
      console.error('Error getting deck analytics:', error);
      throw error;
    }
  }

  /**
   * Generate unique slug for public deck
   */
  static async generateUniqueSlug(baseName, authorSlug) {
    try {
      const baseSlug = `${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${authorSlug}`;
      let slug = baseSlug;
      let attempts = 0;

      while (attempts < 5) {
        const q = query(
          collection(db, 'publicDecks'),
          where('slug', '==', slug),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          return slug;
        }

        slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
        attempts++;
      }

      throw new Error('Failed to generate unique slug');
    } catch (error) {
      console.error('Error generating unique slug:', error);
      throw error;
    }
  }
}
