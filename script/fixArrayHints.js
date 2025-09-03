const admin = require('firebase-admin');

// Initialize Firebase Admin
const { getServiceAccountPath } = require('./config');
const serviceAccount = require(getServiceAccountPath());
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixArrayHints() {
  console.log('Starting to fix array hints...');
  
  try {
    // Get all public cards
    const publicCardsSnapshot = await db.collection('publicCards').get();
    let fixedCount = 0;
    let totalCount = 0;
    
    console.log(`Found ${publicCardsSnapshot.size} public cards to check...`);
    
    for (const doc of publicCardsSnapshot.docs) {
      const cardData = doc.data();
      totalCount++;
      
      // Check if hints is an array
      if (Array.isArray(cardData.hints)) {
        console.log(`Processing card with array hints: ${doc.id} by ${cardData.authorSlug}`);
        console.log(`  - Converting hints array to string: ${JSON.stringify(cardData.hints)}`);
        
        const updatedHints = cardData.hints.join(' ');
        
        await doc.ref.update({
          hints: updatedHints
        });
        fixedCount++;
        console.log(`  - Fixed! New hints: "${updatedHints}"`);
      }
      
      // Also check if hints is undefined or null and set to empty string
      if (cardData.hints === undefined || cardData.hints === null) {
        console.log(`Processing card with undefined/null hints: ${doc.id} by ${cardData.authorSlug}`);
        
        await doc.ref.update({
          hints: ''
        });
        fixedCount++;
        console.log(`  - Fixed! Set hints to empty string`);
      }
    }
    
    console.log(`\n✅ Fix complete!`);
    console.log(`Total cards checked: ${totalCount}`);
    console.log(`Cards fixed: ${fixedCount}`);
    
  } catch (error) {
    console.error('Error fixing array hints:', error);
  }
  
  process.exit(0);
}

// Run the script
fixArrayHints(); 