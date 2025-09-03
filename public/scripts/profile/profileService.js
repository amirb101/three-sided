function createProfileService(firebase, db) {
  return {
    async getProfileBySlug(slug) {
      const profileDoc = await db.collection("profiles").doc(slug).get();
      if (!profileDoc.exists) {
        throw new Error(`Profile not found for slug: ${slug}`);
      }
      return { id: profileDoc.id, ...profileDoc.data() };
    },

    async getUserSlug(userId) {
      const slugDoc = await db.collection("userToSlug").doc(userId).get();
      return slugDoc.exists ? slugDoc.data().slug : null;
    },

    async getProfileByUserId(userId) {
      const slug = await this.getUserSlug(userId);
      if (!slug) return null;
      return this.getProfileBySlug(slug);
    }
  };
}