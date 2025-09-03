const admin = require("firebase-admin");
const serviceAccount = require("C:/Users/amirb/Downloads/firebase_flashcards/three-sided-flashcard-app-firebase-adminsdk-fbsvc-2aa116656d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backfillSpacedRepetition() {
  const snapshot = await db.collection("flashcards").get();
  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.spaced) {
      batch.update(doc.ref, {
        spaced: {
          interval: 1,
          repetition: 0,
          easeFactor: 2.5,
          dueDate: now
        }
      });
    }
  });

  await batch.commit();
  console.log("✅ Backfilled spaced repetition fields for all flashcards missing them.");
}

backfillSpacedRepetition().catch(console.error);
