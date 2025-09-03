function createFriendService(firebase, db) {
  return {
    async getFriendRequests(userId) {
      const requestSnap = await db.collection("friendRequests")
        .where("to", "==", userId)
        .orderBy("timestamp", "desc")
        .get();

      const requests = [];
      for (const doc of requestSnap.docs) {
        const data = doc.data();
        const fromId = data.from;

        const slugSnap = await db.collection("userToSlug").doc(fromId).get();
        const slug = slugSnap.exists ? slugSnap.data().slug : null;

        const profileSnap = slug ? await db.collection("profiles").doc(slug).get() : null;
        const name = profileSnap?.exists ? profileSnap.data().displayName : "Unknown";

        requests.push({
          id: doc.id,
          fromId,
          slug,
          name,
          ...data
        });
      }

      return requests;
    },

    async checkFriendStatus(myId, theirId) {
      const isFriend = await db
        .collection("userFriends").doc(myId)
        .collection("friends").doc(theirId).get();

      const sentRequest = await db
        .collection("friendRequests")
        .where("from", "==", myId)
        .where("to", "==", theirId)
        .get();

      const receivedRequest = await db
        .collection("friendRequests")
        .where("from", "==", theirId)
        .where("to", "==", myId)
        .get();

      return {
        isFriend: isFriend.exists,
        sentRequest: !sentRequest.empty,
        receivedRequest: !receivedRequest.empty,
        receivedRequestData: receivedRequest.empty ? null : receivedRequest.docs[0]
      };
    },

    async getMutualFriends(myId, theirId) {
      const myFriendsSnap = await db.collection("userFriends").doc(myId).collection("friends").get();
      const theirFriendsSnap = await db.collection("userFriends").doc(theirId).collection("friends").get();

      const myFriendIds = new Set(myFriendsSnap.docs.map(d => d.id));
      const theirFriendIds = new Set(theirFriendsSnap.docs.map(d => d.id));

      const mutuals = [...myFriendIds].filter(id => theirFriendIds.has(id) && id !== myId);
      
      if (mutuals.length === 0) return [];

      const firstThree = mutuals.slice(0, 3);
      const names = await Promise.all(
        firstThree.map(async id => {
          const snap = await db.collection("userToSlug").doc(id).get();
          if (!snap.exists) return "Unknown";
          const slug = snap.data().slug;
          const prof = await db.collection("profiles").doc(slug).get();
          return prof.exists ? prof.data().displayName : "Unknown";
        })
      );

      return {
        names,
        total: mutuals.length,
        moreCount: mutuals.length - 3
      };
    },

    async getFriendCount(userId) {
      const friendsSnap = await db.collection("userFriends").doc(userId).collection("friends").get();
      return friendsSnap.size;
    },

    async sendFriendRequest(fromId, toId) {
      await db.collection("friendRequests").add({
        from: fromId,
        to: toId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    },

    async acceptFriendRequest(fromId, toId, requestId = null) {
      // Add to both users' friend lists
      await db.collection("userFriends").doc(toId).collection("friends").doc(fromId).set({});
      await db.collection("userFriends").doc(fromId).collection("friends").doc(toId).set({});

      // Delete the request
      if (requestId) {
        await db.collection("friendRequests").doc(requestId).delete();
      } else {
        const requestSnap = await db.collection("friendRequests")
          .where("from", "==", fromId)
          .where("to", "==", toId)
          .get();

        const batch = db.batch();
        requestSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    },

    async rejectFriendRequest(requestId) {
      await db.collection("friendRequests").doc(requestId).delete();
    }
  };
}
