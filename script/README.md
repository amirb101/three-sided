# Three Sided Flashcard App - Scripts Setup

This directory contains admin scripts for managing the Three Sided Flashcard App Firebase project.

## 🚀 Quick Setup for New Machine

### 1. Install Dependencies
```bash
cd script
npm install
```

### 2. Get Service Account Key
You need a Firebase service account key to run these scripts:

1. Go to [Firebase Console](https://console.firebase.google.com/project/three-sided-flashcard-app/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Save the JSON file in one of these locations:
   - `../three-sided-flashcard-app-firebase-adminsdk-fbsvc-2aa116656d.json` (project root)
   - `../firebase/three-sided-flashcard-app-firebase-adminsdk-fbsvc-2aa116656d.json` (firebase subfolder)
   - `~/Downloads/three-sided-flashcard-app-firebase-adminsdk-fbsvc-2aa116656d.json` (Downloads folder)
   - `~/Desktop/three-sided-flashcard-app-firebase-adminsdk-fbsvc-2aa116656d.json` (Desktop)

### 3. Test Setup
```bash
node setup.js
```

This will verify your configuration and test the Firebase connections.

### 4. Run Scripts
Once setup is complete, you can run any script:

```bash
node backfillUsers.js
node backfillFlashcards.js
node generateSitemap.js
# etc.
```

## 🔧 Available Scripts

- **backfillUsers.js** - Create user documents for existing auth users
- **backfillFlashcards.js** - Backfill flashcard data
- **generateSitemap.js** - Generate sitemap for SEO
- **setup.js** - Test and verify your configuration

## 🛠️ Troubleshooting

If you get authentication errors:
1. Verify the service account key file exists
2. Check that the file path is correct
3. Ensure the key hasn't expired
4. Run `node setup.js` to test your configuration

## 🔒 Security Note

The service account key gives full admin access to your Firebase project. Keep it secure and never commit it to version control.
