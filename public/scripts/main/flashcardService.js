function createFlashcardService(firebase, db) {
  return {
    async getUserCards(userId) {
      const snapshot = await db.collection("flashcards")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    async addFlashcard(userId, data) {
      return db.collection("flashcards").add({
        ...data,
        userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },

    async updateFlashcard(docId, data) {
      return db.collection("flashcards").doc(docId).update(data);
    },

    async deleteFlashcard(docId) {
      return db.collection("flashcards").doc(docId).delete();
    }
  };
}
