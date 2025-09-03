const admin = require("firebase-admin");
const { getServiceAccountPath } = require('./config');
const serviceAccount = require(getServiceAccountPath());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backfillTimestamps() {
  const snapshot = await db.collection("flashcards").get();
  const batch = db.batch();

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.createdAt) {
      batch.update(doc.ref, {
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

  await batch.commit();
  console.log("✅ Timestamps added to flashcards without createdAt");
}

backfillTimestamps().catch(console.error);
