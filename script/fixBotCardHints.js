const admin = require('firebase-admin');

// Initialize Firebase Admin
const { getServiceAccountPath } = require('./config');
const serviceAccount = require(getServiceAccountPath());
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixBotCardHints() {
  console.log('Starting to fix bot card hints...');
  
  try {
    // Get all public cards
    const publicCardsSnapshot = await db.collection('publicCards').get();
    let fixedCount = 0;
    let totalCount = 0;
    
    console.log(`Found ${publicCardsSnapshot.size} public cards to check...`);
    
    for (const doc of publicCardsSnapshot.docs) {
      const cardData = doc.data();
      totalCount++;
      
      // Check if this is a bot card (has authorSlug that starts with 'bot_')
      if (cardData.authorSlug && cardData.authorSlug.startsWith('bot_')) {
        console.log(`Processing bot card: ${doc.id} by ${cardData.authorSlug}`);
        
        let needsUpdate = false;
        let updatedHints = cardData.hints;
        
        // Check if hints is an array
        if (Array.isArray(cardData.hints)) {
          console.log(`  - Converting hints array to string: ${JSON.stringify(cardData.hints)}`);
          updatedHints = cardData.hints.join(' ');
          needsUpdate = true;
        }
        
        // Also check if hints is undefined or null and set to empty string
        if (cardData.hints === undefined || cardData.hints === null) {
          console.log(`  - Setting undefined/null hints to empty string`);
          updatedHints = '';
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await doc.ref.update({
            hints: updatedHints
          });
          fixedCount++;
          console.log(`  - Fixed! New hints: "${updatedHints}"`);
        }
      }
    }
    
    console.log(`\n✅ Fix complete!`);
    console.log(`Total cards checked: ${totalCount}`);
    console.log(`Bot cards fixed: ${fixedCount}`);
    
  } catch (error) {
    console.error('Error fixing bot card hints:', error);
  }
  
  process.exit(0);
}

// Run the script
fixBotCardHints(); 