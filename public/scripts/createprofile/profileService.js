function createProfileService(db) {
  return {
    async isSlugTaken(slug) {
      const doc = await db.collection("profiles").doc(slug).get();
      return doc.exists;
    },

    async createProfile(userId, slug, { displayName, bio, institution }) {
      await db.collection("profiles").doc(slug).set({
        displayName,
        slug,
        bio,
        institution,
        userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await db.collection("userToSlug").doc(userId).set({ slug });
    }
  };
}
