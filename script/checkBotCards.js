const admin = require('firebase-admin');

// Initialize Firebase Admin
const { getServiceAccountPath } = require('./config');
const serviceAccount = require(getServiceAccountPath());
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkBotCards() {
  console.log('Checking bot card structure...');
  
  try {
    // Get all public cards
    const publicCardsSnapshot = await db.collection('publicCards').get();
    let botCardCount = 0;
    
    console.log(`Found ${publicCardsSnapshot.size} public cards to check...`);
    
    for (const doc of publicCardsSnapshot.docs) {
      const cardData = doc.data();
      
      // Check for any cards that might be bot cards
      if (cardData.authorSlug && (
        cardData.authorSlug.startsWith('bot_') || 
        cardData.authorSlug.includes('bot') ||
        cardData.authorSlug.includes('ai') ||
        cardData.authorSlug.includes('gpt')
      )) {
        botCardCount++;
        console.log(`\nBot card found: ${doc.id}`);
        console.log(`  authorSlug: ${cardData.authorSlug}`);
        console.log(`  hints type: ${typeof cardData.hints}`);
        console.log(`  hints value: ${JSON.stringify(cardData.hints)}`);
        console.log(`  statement: ${cardData.statement?.substring(0, 100)}...`);
      }
      
      // Also check for cards with array hints regardless of author
      if (Array.isArray(cardData.hints)) {
        console.log(`\nCard with array hints found: ${doc.id}`);
        console.log(`  authorSlug: ${cardData.authorSlug}`);
        console.log(`  hints array: ${JSON.stringify(cardData.hints)}`);
      }
    }
    
    console.log(`\n✅ Check complete!`);
    console.log(`Total cards checked: ${publicCardsSnapshot.size}`);
    console.log(`Potential bot cards found: ${botCardCount}`);
    
  } catch (error) {
    console.error('Error checking bot cards:', error);
  }
  
  process.exit(0);
}

// Run the script
checkBotCards(); 