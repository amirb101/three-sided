const path = require('path');
const fs = require('fs');

// Try to find the service account key file
function getServiceAccountPath() {
  // Search for any Firebase admin SDK key in the project root
  const projectRoot = path.join(__dirname, '..');
  
  try {
    const files = fs.readdirSync(projectRoot);
    
    for (const file of files) {
      if (file.includes('firebase-adminsdk') && file.endsWith('.json')) {
        const filePath = path.join(projectRoot, file);
        console.log(`✅ Found service account key: ${path.basename(file)}`);
        return filePath;
      }
    }
  } catch (error) {
    console.error('❌ Error reading project directory:', error.message);
  }

  // If no file found, provide helpful error message
  console.error('❌ Service account key file not found!');
  console.error('Please download it from Firebase Console:');
  console.error('1. Go to https://console.firebase.google.com/project/three-sided-flashcard-app/settings/serviceaccounts/adminsdk');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the JSON file in the project root (will be auto-detected)');
  
  throw new Error('Service account key file not found. Please download it from Firebase Console.');
}

module.exports = {
  getServiceAccountPath
};
