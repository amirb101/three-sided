function createPublicCardService(firebase, db) {
  return {
    async getPublicCardsBySlug(slug, sort = "upvotes") {
      // Get profile to find userId for backwards compatibility
      const profileDoc = await db.collection("profiles").doc(slug).get();
      if (!profileDoc.exists) {
        throw new Error(`Profile not found for slug: ${slug}`);
      }
      const userId = profileDoc.data().userId;
      
      // Query by both authorSlug (old system) AND userId (new system compatibility)
      const queries = [
        // Cards with authorSlug matching the profile slug
        db.collection("publicCards").where("authorSlug", "==", slug),
        // Cards with userId matching the profile owner (for cards created without authorSlug)
        db.collection("publicCards").where("userId", "==", userId)
      ];
      
      // Execute both queries
      const results = await Promise.all(queries.map(q => q.get()));
      
      // Combine results and deduplicate
      const allCards = new Map();
      results.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          allCards.set(doc.id, { id: doc.id, ...doc.data() });
        });
      });
      
      // Convert to array and sort
      let cards = Array.from(allCards.values());
      if (sort === "upvotes") {
        cards.sort((a, b) => {
          if (b.likeCount !== a.likeCount) {
            return (b.likeCount || 0) - (a.likeCount || 0);
          }
          return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        });
      } else {
        cards.sort((a, b) => {
          if (b.createdAt?.toMillis() !== a.createdAt?.toMillis()) {
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
          }
          return (b.likeCount || 0) - (a.likeCount || 0);
        });
      }
      
      return cards;
    },

    async getPublicCard(cardId) {
      const doc = await db.collection("publicCards").doc(cardId).get();
      if (!doc.exists) throw new Error("Card not found");
      return { id: doc.id, ...doc.data() };
    },

    async updatePublicCard(cardId, data) {
      const updatedData = {
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("publicCards").doc(cardId).update(updatedData);
    },

    async deletePublicCard(cardId) {
      await db.collection("publicCards").doc(cardId).delete();
    },

    async saveCardToPersonal(userId, publicCardData) {
      await db.collection("flashcards").add({
        userId: userId,
        statement: publicCardData.statement,
        hints: publicCardData.hints,
        proof: publicCardData.proof,
        tags: publicCardData.tags || [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  };
}