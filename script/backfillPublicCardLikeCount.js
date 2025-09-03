// backfillPublicCardLikeCount.js
// Sets likeCount: 0 for all publicCards missing the field

const admin = require('firebase-admin');
const serviceAccount = require('../three-sided-flashcard-app-firebase-adminsdk-fbsvc-2aa116656d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backfillLikeCount() {
  const snapshot = await db.collection('publicCards').get();
  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (typeof data.likeCount !== 'number') {
      await doc.ref.update({ likeCount: 0 });
      updated++;
      console.log(`Updated ${doc.id}`);
    }
  }
  console.log(`Done! Updated ${updated} documents.`);
  process.exit(0);
}

backfillLikeCount().catch(err => {
  console.error('Error during backfill:', err);
  process.exit(1);
}); 