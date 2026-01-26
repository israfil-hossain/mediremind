# Firebase Setup Guide for MedRemind

This guide explains how to set up Firebase for cloud backup and Google Sign-In in the MedRemind app.

## Prerequisites

- A Google account
- Node.js and npm installed
- Expo CLI installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `medremind` (or your preferred name)
4. Enable/disable Google Analytics as preferred
5. Click "Create project"

## Step 2: Add Android App to Firebase

1. In Firebase Console, click the Android icon to add an Android app
2. Enter the Android package name: `com.flowentech.mediremind`
3. Enter app nickname: `MedRemind Android`
4. Download `google-services.json`
5. Place the file in your project root directory

## Step 3: Add iOS App to Firebase

1. In Firebase Console, click the iOS icon to add an iOS app
2. Enter the iOS bundle ID: `com.flowentech.mediremind`
3. Enter app nickname: `MedRemind iOS`
4. Download `GoogleService-Info.plist`
5. Place the file in your project root directory

## Step 4: Enable Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Click on **Google** provider
5. Enable it and configure:
   - Project support email: your email
   - Web client ID: copy this for later
6. Click "Save"

## Step 5: Enable Firestore Database

1. In Firebase Console, go to **Build > Firestore Database**
2. Click "Create database"
3. Choose "Start in production mode" (we'll set up rules)
4. Select a location close to your users
5. Click "Done"

## Step 6: Set Up Firestore Security Rules

Go to **Firestore Database > Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Medications subcollection
      match /medications/{medicationId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Dose history subcollection
      match /dose_history/{doseId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Click "Publish" to save the rules.

## Step 7: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Web Client ID:
   ```
   EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   ```

   To find your Web Client ID:
   - Go to Firebase Console > Project Settings > General
   - Scroll down to "Your apps" section
   - Find the Web app (or create one if needed)
   - Copy the "Web client ID" from OAuth 2.0 Client IDs

## Step 8: Build the App

Since we're using native Firebase packages, you need to create a development build:

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS Build
eas build:configure

# Create a development build for Android
eas build --profile development --platform android

# Create a development build for iOS
eas build --profile development --platform ios
```

## Step 9: Run the App

After the build completes:

```bash
# For development
npx expo start --dev-client

# Or run directly on device
npx expo run:android
npx expo run:ios
```

## File Structure

After setup, your project should have:

```
medicine-reminder-app/
├── google-services.json          # Android Firebase config
├── GoogleService-Info.plist      # iOS Firebase config
├── .env                          # Environment variables
├── config/
│   └── env.ts                    # Environment config loader
├── utils/
│   ├── firebase.ts               # Firebase service
│   ├── networkSync.ts            # Network sync service
│   └── storage.ts                # Storage with sync support
├── contexts/
│   └── AuthContext.tsx           # Auth context provider
└── app/
    └── settings/
        └── index.tsx             # Settings screen with Google login
```

## How Sync Works

### Online Mode
When the device is online and user is signed in:
1. Data is saved to local AsyncStorage first
2. Then immediately synced to Firebase Firestore
3. If sync fails, item is added to sync queue

### Offline Mode
When the device is offline:
1. Data is saved to local AsyncStorage
2. Item is added to sync queue for later
3. When connection is restored, queue is processed

### Sync Queue
- The app monitors network connectivity
- When coming back online, all queued items are synced
- Failed syncs are retried automatically

## Troubleshooting

### "Firebase not initialized" error
- Ensure `google-services.json` and `GoogleService-Info.plist` are in the project root
- Make sure you've created a development build (not using Expo Go)

### "No ID token found" error
- Check that Google Sign-In is enabled in Firebase Console
- Verify the Web Client ID is correctly set in `.env`

### Sync not working
- Check internet connectivity
- Verify user is signed in
- Check Firestore security rules
- Look for errors in console logs

## Testing

1. Sign in with Google on the Settings screen
2. Add a medication
3. Check Firebase Console > Firestore to see the data
4. Turn off internet, add another medication
5. Turn internet back on, verify it syncs

## Security Notes

- User data is isolated by user ID
- Only authenticated users can access their data
- Firestore rules prevent unauthorized access
- Data is encrypted in transit (HTTPS)
