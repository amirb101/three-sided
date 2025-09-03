const admin = require('firebase-admin');

console.log('Starting debug script...');

// Initialize Firebase Admin
const { getServiceAccountPath } = require('./config');
const serviceAccount = require(getServiceAccountPath());
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugCheck() {
  console.log('Firebase initialized, checking connection...');
  
  try {
    // Get a small sample of cards
    const publicCardsSnapshot = await db.collection('publicCards').limit(5).get();
    console.log(`Found ${publicCardsSnapshot.size} cards in sample`);
    
    for (const doc of publicCardsSnapshot.docs) {
      const cardData = doc.data();
      console.log(`Card: ${doc.id}`);
      console.log(`  authorSlug: ${cardData.authorSlug}`);
      console.log(`  hints type: ${typeof cardData.hints}`);
      console.log(`  hints is array: ${Array.isArray(cardData.hints)}`);
      if (Array.isArray(cardData.hints)) {
        console.log(`  hints array: ${JSON.stringify(cardData.hints)}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('Debug complete!');
  process.exit(0);
}

debugCheck(); 