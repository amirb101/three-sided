function createPublicCardService(firebase, db) {
  return {
    async getPublicCardsBySlug(slug, sort = "upvotes") {
      let query = db.collection("publicCards").where("authorSlug", "==", slug);
      if (sort === "upvotes") {
        query = query.orderBy("likeCount", "desc").orderBy("createdAt", "desc");
      } else {
        query = query.orderBy("createdAt", "desc").orderBy("likeCount", "desc");
      }
      const cardsSnap = await query.get();
      return cardsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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