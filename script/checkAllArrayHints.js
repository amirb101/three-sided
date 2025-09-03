const admin = require('firebase-admin');

// Initialize Firebase Admin
const { getServiceAccountPath } = require('./config');
const serviceAccount = require(getServiceAccountPath());
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAllArrayHints() {
  console.log('Checking ALL cards for array hints...');
  
  try {
    // Get all public cards
    const publicCardsSnapshot = await db.collection('publicCards').get();
    let arrayHintsCount = 0;
    let totalCount = 0;
    
    console.log(`Found ${publicCardsSnapshot.size} public cards to check...`);
    
    for (const doc of publicCardsSnapshot.docs) {
      const cardData = doc.data();
      totalCount++;
      
      // Check if hints is an array
      if (Array.isArray(cardData.hints)) {
        arrayHintsCount++;
        console.log(`\nCard with array hints found: ${doc.id}`);
        console.log(`  authorSlug: ${cardData.authorSlug}`);
        console.log(`  hints array: ${JSON.stringify(cardData.hints)}`);
      }
      
      // Also check for undefined/null hints
      if (cardData.hints === undefined || cardData.hints === null) {
        console.log(`\nCard with undefined/null hints: ${doc.id}`);
        console.log(`  authorSlug: ${cardData.authorSlug}`);
      }
    }
    
    console.log(`\n✅ Check complete!`);
    console.log(`Total cards checked: ${totalCount}`);
    console.log(`Cards with array hints: ${arrayHintsCount}`);
    
    if (arrayHintsCount === 0) {
      console.log(`🎉 All cards already have string hints!`);
    }
    
  } catch (error) {
    console.error('Error checking array hints:', error);
  }
  
  process.exit(0);
}

// Run the script
checkAllArrayHints(); 