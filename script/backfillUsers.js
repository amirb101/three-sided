const admin = require('firebase-admin');
const fs = require('fs');

var serviceAccount = require("C:/Users/amirb/Downloads/firebase_flashcards/three-sided-flashcard-app-firebase-adminsdk-fbsvc-2aa116656d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const auth = admin.auth();
const db = admin.firestore();

async function backfillUsers() {
  let nextPageToken = undefined;
  let total = 0;

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    for (const user of listUsersResult.users) {
      const uid = user.uid;
      const email = user.email || 'unknown';

      const userRef = db.collection('users').doc(uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        await userRef.set({
          isPremium: false,
          email: email,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Created doc for user: ${email} (${uid})`);
        total++;
      } else {
        console.log(`User already exists: ${email} (${uid})`);
      }
    }

    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  console.log(`✅ Done. ${total} new user docs created.`);
}

backfillUsers().catch(err => {
  console.error("❌ Error during backfill:", err);
});
