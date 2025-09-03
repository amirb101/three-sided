const admin = require('firebase-admin');
var serviceAccount = require("C:/Users/amirb/Downloads/firebase_flashcards/three-sided-flashcard-app-firebase-adminsdk-fbsvc-2aa116656d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function safeBackfillUsers() {
  let nextPageToken = undefined;
  let totalUpdated = 0;

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    for (const user of listUsersResult.users) {
      const uid = user.uid;
      const email = user.email || 'unknown';

      const userRef = db.collection('users').doc(uid);
      const doc = await userRef.get();
      const data = doc.data() || {};

      const updateFields = {};
      if (data.email === undefined) updateFields.email = email;
      if (data.isPremium === undefined) updateFields.isPremium = false;
      if (data.createdAt === undefined) updateFields.createdAt = admin.firestore.FieldValue.serverTimestamp();
      if (data.displayName === undefined) updateFields.displayName = null;
      if (data.bio === undefined) updateFields.bio = "Hi, I'm new here!";
      if (data.numBundles === undefined) updateFields.numBundles = 0;

      if (Object.keys(updateFields).length > 0) {
await userRef.set(updateFields, { merge: true });
        console.log(`Updated user ${email} (${uid}) with missing fields`);
        totalUpdated++;
      } else {
        console.log(`User ${email} (${uid}) already has all fields`);
      }
    }

    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  console.log(`✅ Backfill complete: ${totalUpdated} user docs updated.`);
}

safeBackfillUsers().catch(err => {
  console.error("❌ Error during safe backfill:", err);
});
