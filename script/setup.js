const { getServiceAccountPath } = require('./config');
const admin = require('firebase-admin');

console.log('🚀 Setting up Firebase Admin SDK for Three Sided Flashcard App...\n');

try {
  // Get the service account path
  const serviceAccountPath = getServiceAccountPath();
  
  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
  });

  console.log('✅ Firebase Admin SDK initialized successfully!');
  
  // Test the connection
  const db = admin.firestore();
  console.log('✅ Firestore connection established!');
  
  // Test auth connection
  const auth = admin.auth();
  console.log('✅ Auth connection established!');
  
  console.log('\n🎉 Setup complete! Your scripts should now work properly.');
  console.log('\nYou can now run any of these scripts:');
  console.log('  - node backfillUsers.js');
  console.log('  - node backfillFlashcards.js');
  console.log('  - node generateSitemap.js');
  console.log('  - And more...');
  
} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  console.log('\n📋 Next steps:');
  console.log('1. Download the service account key from Firebase Console');
  console.log('2. Save it in one of the locations mentioned above');
  console.log('3. Run this setup script again');
}
